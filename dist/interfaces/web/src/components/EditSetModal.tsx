import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { supabase } from '../lib/supabase';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconUpload, IconX } from '@tabler/icons-react';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import { CoverArt } from './CoverArt';
import { SEED_COVER_LIST, sizedCover } from '../brand/seedCovers';
import api, { type TrackSnapshot } from '../api';
import { useUI } from '../store/ui';
import { formatDuration } from '../brand/format';
import { mutate as swrMutate } from 'swr';

// One row inside the reorderable track list. The mono number is sequential
// based on row position — when we reorder, the numbers stay put and the
// content moves between numbered slots, like a record-sleeve back cover.
function SortableRow({
  track,
  index,
  onRemove,
}: {
  track: TrackSnapshot;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(track.itunesTrackId),
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    boxShadow: isDragging ? 'inset 0 0 0 1px var(--ink)' : undefined,
    background: isDragging ? 'var(--paper)' : undefined,
  };

  return (
    <div ref={setNodeRef} className="edit-track-row" style={style}>
      <button
        className="edit-track-handle"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <IconGripVertical size={14} stroke={1.5} />
      </button>
      <span className="row-num mono-meta">{String(index + 1).padStart(2, '0')}</span>
      <CoverArt url={track.coverUrl} size={120} hover={false} style={{ width: 48, height: 48 }} />
      <div style={{ minWidth: 0 }}>
        <div className="subhead" style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </div>
        <div className="caption smoke" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </div>
      </div>
      <span className="mono-meta smoke">{formatDuration(track.durationMs)}</span>
      <button
        className="btn-icon"
        onClick={onRemove}
        aria-label="Remove cut"
        title="Remove from set"
      >
        <IconX size={14} stroke={1.5} />
      </button>
    </div>
  );
}

export function EditSetModal() {
  const setId = useUI((s) => s.editSetId);
  const close = useUI((s) => s.closeEditSet);
  const open = !!setId;

  // Load the full set when the modal opens.
  const { data, isLoading } = useSWR(
    open && setId ? ['/getSet', setId] : null,
    () => (setId ? api.getSet({ setId }) : null),
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [tracks, setTracks] = useState<TrackSnapshot[]>([]);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hydrate form whenever the modal opens with new data.
  useEffect(() => {
    if (data && open) {
      const set = (data as any).set;
      setTitle(set.title);
      setDescription(set.description ?? '');
      setCoverUrl(set.coverUrl);
      setTracks(set.tracks ?? []);
      setShowCoverPicker(false);
      setError(null);
    }
  }, [data, open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tracks.findIndex((t) => String(t.itunesTrackId) === active.id);
    const newIdx = tracks.findIndex((t) => String(t.itunesTrackId) === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setTracks(arrayMove(tracks, oldIdx, newIdx));
  };

  const removeTrack = (id: number) => {
    setTracks(tracks.filter((t) => t.itunesTrackId !== id));
  };

  // File upload — stores cover in Supabase Storage and returns its public URL.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `covers/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('covers').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('covers').getPublicUrl(path);
      const url = publicUrl;
      setCoverUrl(url);
      setShowCoverPicker(false);
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!setId) return;
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.updateSet({
        setId,
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        coverUrl,
        tracks,
      });
      // Refresh the set detail and any feed/channel queries that touch it.
      await swrMutate(['/getSet', setId]);
      // Kick the home feed and the owner's channel cache so they re-fetch on next view.
      await swrMutate((key) => Array.isArray(key) && (key[0] === '/getHomeFeed' || key[0] === '/getChannel'));
      close();
    } catch (err: any) {
      setError(err?.message ?? 'Signal lost. Retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalMs = tracks.reduce((sum, t) => sum + t.durationMs, 0);

  return (
    <Modal
      open={open}
      onClose={close}
      title="EDIT SET. ▪"
      width="wide"
      footer={
        <>
          <button className="btn-text" onClick={close}>CANCEL</button>
          <button
            className="btn btn-fill"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting || isLoading}
            style={{ minWidth: 120 }}
          >
            {submitting ? <Spinner /> : 'SAVE'}
          </button>
        </>
      }
    >
      {isLoading || !data ? (
        <div style={{ padding: 24 }}>
          <div className="mono-label smoke">RECEIVING.</div>
        </div>
      ) : (
        <>
          {/* Title */}
          <input
            className="input-display"
            placeholder="Title your set."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          {/* Description */}
          <div style={{ marginTop: 24 }}>
            <textarea
              className="input-textarea"
              placeholder="Liner notes — optional."
              value={description}
              maxLength={280}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ border: 0, borderBottom: '1px solid var(--ink)', padding: '12px 0' }}
            />
          </div>

          {/* Cover */}
          <div style={{ marginTop: 32, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 96, height: 96, flexShrink: 0 }}>
              <CoverArt url={coverUrl} size={400} hover={false} alt="Cover" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="mono-label" style={{ marginBottom: 8 }}>COVER</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-line"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Spinner /> : <><IconUpload size={14} stroke={1.5} /> UPLOAD</>}
                </button>
                <button
                  className="btn btn-line"
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                >
                  {showCoverPicker ? 'HIDE' : 'PICK A SEED'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              {showCoverPicker && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 48px)',
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  {SEED_COVER_LIST.map((c) => (
                    <button
                      key={c.slot}
                      type="button"
                      onClick={() => {
                        setCoverUrl(c.url);
                        setShowCoverPicker(false);
                      }}
                      style={{
                        width: 48,
                        height: 48,
                        border: coverUrl === c.url ? '2px solid var(--ink)' : '1px solid var(--mist)',
                        padding: 0,
                        background: 'transparent',
                      }}
                    >
                      <img
                        src={sizedCover(c.url, 96) ?? c.url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Track list — drag to reorder, X to delete */}
          <div style={{ marginTop: 32 }}>
            <div className="mono-label" style={{ marginBottom: 12 }}>
              CUTS{' '}
              <span className="smoke" style={{ marginLeft: 8 }}>
                {tracks.length} · {formatDuration(totalMs)}
              </span>
            </div>
            {tracks.length === 0 ? (
              <p className="caption smoke" style={{ padding: '24px 0' }}>
                Empty set. Cuts can be filed from search or The Wire.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tracks.map((t) => String(t.itunesTrackId))}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="edit-track-list">
                    {tracks.map((t, i) => (
                      <SortableRow
                        key={t.itunesTrackId}
                        track={t}
                        index={i}
                        onRemove={() => removeTrack(t.itunesTrackId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {error && (
            <div className="mono-label heat" style={{ marginTop: 16 }}>
              <span className="heat">▪</span> {error}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
