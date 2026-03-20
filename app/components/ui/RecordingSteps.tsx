"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import StepRow from "./StepRow";
import { useRecording } from "@/hooks/RecordingContext";

export default function InteractiveRecordingSteps() {
  const { startCountdown, stopRecording, isIdle, isRecording, isCountdown, isProcessing } = useRecording();

  const getStartButtonContent = () => {
    if (isCountdown) {
      return (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          Preparando...
        </>
      );
    }
    if (isRecording) {
      return (
        <>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2" />
          Grabando...
        </>
      );
    }
    if (isProcessing) {
      return (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          Procesando...
        </>
      );
    }
    return (
      <>
        <Icon icon="material-symbols:cast-outline-rounded" className="size-6 mr-2" />
        Compartir pantalla
      </>
    );
  };

  const stepsData = [
    {
      id: 1,
      title: "Inicia la captura",
      description: (
        <p>
          Haz clic en el botón de abajo. Tu navegador te pedirá qué deseas compartir. Para un rendimiento óptimo y tomas más limpias, te recomendamos seleccionar una <strong>Pestaña</strong> o <strong>Ventana específica</strong>.
        </p>
      ),
      isReversed: true,
      actionButton: (
        <Button
          variant="outline"
          size="xl"
          className={`text-lg ${isRecording ? 'border-red-500/50 text-red-400' : ''} ${!isIdle ? 'opacity-70 cursor-not-allowed' : ''}`}
          onClick={startCountdown}
          disabled={!isIdle}
        >
          {getStartButtonContent()}
        </Button>
      ),
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative group shadow-2xl">
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [bg-size:16px_16px] opacity-10"></div>
          <div className="bg-[#141414] border border-white/10 rounded-lg p-5 w-3/4 shadow-2xl relative z-10 flex flex-col">
            <div className="flex gap-6 mb-4 border-b border-white/10 pb-3 text-sm text-neutral-500 font-medium">
              <span className="text-white border-b border-white pb-3 -mb-3.25">Pestaña de Chrome</span>
              <span>Ventana</span>
              <span>Pantalla Completa</span>
            </div>
            <div className="h-28 bg-white/5 rounded border border-white/10 flex items-center justify-center mb-4">
              <Icon icon="solar:browser-minimalistic-linear" className="text-neutral-500 text-4xl" />
            </div>
            <div className="flex justify-end gap-3 mt-auto">
              <div className="px-4 py-1.5 border border-white/10 text-neutral-400 rounded text-sm">Cancelar</div>
              <div className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm">Compartir</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: "Oculta las distracciones",
      description: (
        <p>
          Si decides compartir toda tu pantalla, tu navegador mostrará automáticamente una barra flotante avisando que la captura está activa. Haz clic en <strong>&quot;Ocultar&quot;</strong> para asegurarte de que no aparezca en tu video final.
        </p>
      ),
      isReversed: false,
      actionButton: null,
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative group shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-blue-500/10 rounded-[100%] blur-3xl"></div>
          <div className="bg-[#1E1E20] border border-white/10 rounded-full px-5 py-3 flex items-center gap-6 shadow-2xl z-10">
            <div className="flex items-center gap-3">
              <Icon icon="logos:chrome" className="text-xl" />
              <span className="text-sm text-neutral-200">app.openvid.com está compartiendo tu pantalla.</span>
            </div>
            <div className="flex gap-4 border-l border-white/10 pl-4">
              <span className="text-sm text-blue-400 font-medium cursor-pointer hover:text-blue-300">Dejar de compartir</span>
              <span className="text-sm text-blue-400 font-medium cursor-pointer hover:text-white transition-colors relative group/btn">
                Ocultar
                <Icon icon="solar:cursor-default-bold" className="absolute -bottom-4 -right-2 text-white text-xl drop-shadow-md" />
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: "Prepárate para la acción",
      description: (
        <p>
          No hay prisa. Una vez que apruebes los permisos en el paso 1, iniciaremos una cuenta regresiva de 4 segundos. Verás el indicador en la pestaña del navegador para que sepas exactamente cuándo empezar a hablar o mover el mouse.
        </p>
      ),
      isReversed: true,
      actionButton: null,
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden flex flex-col items-center justify-center relative group shadow-2xl">
          <div className="absolute inset-0 bg-linear-to-t from-red-500/5 via-transparent to-transparent"></div>
          <div className="absolute top-6 left-6 right-6 h-10 bg-[#141414] border border-white/10 rounded-md flex items-center px-4 gap-3 shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm text-neutral-400 font-mono">🔴 Grabando en 4...</span>
          </div>
          <span className="text-[120px] font-light text-white tracking-tighter mt-12">
            4
          </span>
        </div>
      ),
    },
    {
      id: 4,
      title: "Corte y al editor",
      description: (
        <p>
          Cuando termines tu explicación, simplemente detén la grabación. El archivo no se descargará de inmediato; pasará mágicamente a nuestro editor web para que apliques zooms, fondos y recortes.
        </p>
      ),
      isReversed: false,
      actionButton: (
        <Button
          variant="outline"
          size="xl"
          className={`text-lg ${isRecording ? 'text-red-500 border-red-500/50 hover:bg-red-500/10' : 'text-neutral-500 border-neutral-500/50 cursor-not-allowed opacity-50'}`}
          onClick={stopRecording}
          disabled={!isRecording}
        >
          <div className={`w-4 h-4 rounded-sm mr-2 ${isRecording ? 'bg-red-500' : 'bg-neutral-500'}`}></div>
          Detener grabación
        </Button>
      ),
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative group shadow-2xl">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5"></div>
          <div className="absolute top-0 left-1/2 w-[1px] h-full bg-white/5"></div>
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center backdrop-blur-sm relative shadow-[0_0_40px_rgba(239,68,68,0.15)] z-10 group-hover:bg-red-500/20 transition-all duration-500">
            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-ping opacity-20"></div>
            <div className="w-6 h-6 bg-red-500 rounded-sm"></div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div id="docs" className="w-full max-w-7xl mx-auto px-6 py-24 text-left">
      <div className="max-w-3xl mx-auto text-center mb-32">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6 leading-tight drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
          Crea tu toma en <br />
          <span className="bg-linear-to-r from-[#003780] to-white bg-clip-text text-transparent">
            cuatro sencillos pasos
          </span>
        </h2>
        <p className="text-lg md:text-xl text-neutral-400 font-light leading-relaxed">
          Sigue estas instrucciones para capturar tu pantalla. Todo el proceso ocurre en tu navegador, sin necesidad de instalar nada.
        </p>
      </div>

      <div className="space-y-32">
        {stepsData.map((step) => (
          <StepRow
            key={step.id}
            number={step.id}
            title={step.title}
            description={step.description}
            visual={step.visual}
            actionButton={step.actionButton}
            isReversed={step.isReversed}
          />
        ))}
      </div>
    </div>
  );
}