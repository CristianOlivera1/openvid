export default function ProjectorLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#000" }}>{children}</body>
    </html>
  );
}
