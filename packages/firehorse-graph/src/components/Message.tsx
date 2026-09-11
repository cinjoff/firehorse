interface MessageProps {
  readonly title: string;
  readonly children: React.ReactNode;
}

/** Loading, empty, and failure all land here — one shape, different words. */
export function Message({ title, children }: MessageProps) {
  return (
    <div className="message">
      <h2 className="message__title">{title}</h2>
      <div className="message__body">{children}</div>
    </div>
  );
}
