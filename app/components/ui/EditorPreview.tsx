import {Icon}  from "@iconify/react";

export default function EditorPreview() {
  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="absolute -inset-1 bg-gradient-to-b from-neutral-700/20 to-transparent rounded-2xl blur-sm -z-10"></div>
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 flex flex-col md:flex-row h-[600px] text-left">

        <div className="w-full md:w-64 bg-[#0F0F0F] border-r border-white/10 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">Properties</span>
            <Icon icon="solar:settings-linear" className="text-neutral-500" />
          </div>

          <div className="p-5 space-y-6 overflow-y-auto editor-scroll">
            <div className="space-y-3">
              <label className="text-sm text-neutral-300 font-medium flex items-center gap-2">
                <Icon icon="solar:gallery-wide-linear" width="16" />
                Background
              </label>
              <div className="grid grid-cols-4 gap-2">
                <div className="aspect-square rounded border border-white/20 bg-gradient-to-br from-purple-900 to-indigo-900 cursor-pointer ring-2 ring-white/20"></div>
                <div className="aspect-square rounded border border-white/10 bg-gradient-to-br from-neutral-800 to-neutral-900 cursor-pointer hover:border-white/20"></div>
                <div className="aspect-square rounded border border-white/10 bg-[#1a1a1a] cursor-pointer hover:border-white/20"></div>
                <div className="aspect-square rounded border border-white/10 relative overflow-hidden cursor-pointer hover:border-white/20 group">
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 text-white/50 group-hover:text-white transition-colors">
                    <Icon icon="solar:add-circle-linear" width="20" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm text-neutral-300 font-medium">Padding</label>
                <span className="text-xs text-neutral-500">64px</span>
              </div>
              <input type="range" min="0" max="100" defaultValue="64" className="w-full" />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm text-neutral-300 font-medium">Roundness</label>
                <span className="text-xs text-neutral-500">12px</span>
              </div>
              <input type="range" min="0" max="24" defaultValue="12" className="w-full" />
            </div>

            <div className="h-px bg-white/5 my-2"></div>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors flex items-center gap-2">
                  <Icon icon="solar:cursor-square-linear" className="text-neutral-500" />
                  Show Cursor
                </span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultValue="" className="sr-only peer" />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-200"></div>
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-sm text-neutral-300 group-hover:text-white transition-colors flex items-center gap-2">
                  <Icon icon="solar:box-minimalistic-linear" className="text-neutral-500" />
                  Shadow
                </span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultValue="" className="sr-only peer" />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-200"></div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
            <button className="w-full py-2 bg-neutral-100 hover:bg-white text-black text-sm font-medium rounded transition-colors flex items-center justify-center gap-2">
              Export Video
              <Icon icon="solar:export-linear" width="16" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#141414] relative flex flex-col">
          <div className="h-12 border-b border-white/10 flex items-center justify-center gap-1 px-4">
            <button className="p-2 hover:bg-white/5 rounded text-neutral-400 hover:text-white transition-colors">
              <Icon icon="solar:scissors-linear" width="18" />
            </button>
            <button className="p-2 hover:bg-white/5 rounded text-neutral-400 hover:text-white transition-colors">
              <Icon icon="solar:magnifier-zoom-in-linear" width="18" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-2"></div>
            <span className="text-xs font-mono text-neutral-500">00:04 / 00:15</span>
          </div>

          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-3xl"></div>
            <div className="w-full h-full absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
            ></div>

            <div className="relative w-[80%] aspect-video bg-[#1a1a1a] rounded-lg shadow-2xl border border-white/10 overflow-hidden transform transition-transform duration-700 hover:scale-[1.02]">
              <div className="h-8 bg-[#252525] flex items-center px-3 border-b border-white/10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]"></div>
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-block px-3 py-0.5 rounded bg-black/20 text-[10px] text-neutral-500 font-mono">openvid.app</div>
                </div>
              </div>
              <div className="p-6 relative h-full">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-800 animate-pulse"></div>
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-2 bg-neutral-800 rounded w-1/4"></div>
                    <div className="h-2 bg-neutral-800 rounded w-3/4"></div>
                    <div className="h-2 bg-neutral-800 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/3 w-32 h-32 border-2 border-indigo-500 rounded-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] pointer-events-none flex items-start justify-start">
                  <div className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-tl-sm font-bold">ZOOM 2x</div>
                </div>
                <div className="absolute top-[60%] left-[40%] text-white drop-shadow-md">
                  <Icon icon="solar:cursor-bold" width="24" />
                </div>
              </div>
            </div>
          </div>

          <div className="h-32 bg-[#0F0F0F] border-t border-white/10 flex flex-col">
            <div className="h-6 border-b border-white/10 flex items-end px-2">
              <div className="flex w-full justify-between text-[10px] text-neutral-600 font-mono pb-1">
                <span>00:00</span>
                <span>00:05</span>
                <span>00:10</span>
                <span>00:15</span>
              </div>
            </div>
            <div className="flex-1 p-3 relative overflow-hidden">
              <div className="space-y-2">
                <div className="h-8 bg-neutral-800/50 rounded flex items-center overflow-hidden border border-white/10 relative">
                  <div className="absolute left-0 w-[40%] h-full bg-indigo-500/20 border-r border-indigo-500/50"></div>
                  <div className="flex gap-1 w-full px-1 opacity-20">
                    <div className="h-full w-8 bg-neutral-600 rounded-sm"></div>
                    <div className="h-full w-8 bg-neutral-600 rounded-sm"></div>
                    <div className="h-full w-8 bg-neutral-600 rounded-sm"></div>
                    <div className="h-full w-8 bg-neutral-600 rounded-sm"></div>
                  </div>
                </div>
                <div className="h-6 bg-neutral-800/30 rounded flex items-center px-2 overflow-hidden border border-white/10">
                  <div className="flex items-center gap-0.5 w-full">
                    <div className="w-1 h-2 bg-neutral-600 rounded-full"></div>
                    <div className="w-1 h-3 bg-neutral-600 rounded-full"></div>
                    <div className="w-1 h-4 bg-neutral-600 rounded-full"></div>
                    <div className="w-1 h-2 bg-neutral-600 rounded-full"></div>
                    <div className="w-1 h-3 bg-neutral-600 rounded-full"></div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 left-[40%] h-full w-px bg-red-500 z-10">
                <div className="absolute -top-1 -left-[5px] text-red-500">
                  <Icon icon="solar:polygon-down-bold" width="12" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}