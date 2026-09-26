/** Web build of WebContentStage: a plain iframe. */
export function WebContentStage({
  url,
  aspect = 'tall',
}: {
  url: string;
  aspect?: 'video' | 'tall';
}) {
  return (
    <iframe
      title="content"
      src={url}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{
        width: '100%',
        border: 0,
        background: '#000',
        ...(aspect === 'video' ? { aspectRatio: '16 / 9' } : { height: 520 }),
      }}
    />
  );
}
