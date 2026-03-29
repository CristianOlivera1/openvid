export default function EditorPreview() {
  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="absolute -inset-1 bg-linear-to-b from-neutral-700/10 to-transparent rounded-2xl blur-md -z-10"></div>
      
      <div>
        <img 
          src="/images/pages/openvid.webp"
          alt="openvid Editor Preview" 
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </div>
    </div>
  );
}