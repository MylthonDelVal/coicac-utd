import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './lib/supabase';
import Swal from 'sweetalert2'; // Importamos SweetAlert2

function Scanner() {
  const [diaActual, setDiaActual] = useState(1);
  const [status, setStatus] = useState('Listo para escanear');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    });

    scanner.render(async (decodedText) => {
      if (isScanning) return; 
      
      setIsScanning(true);
      setStatus('Validando registro...');

      try {
        const { data: p, error: pError } = await supabase
          .from('participantes')
          .select('*')
          .eq('id', decodedText)
          .single();

        if (pError || !p) {
          setStatus('❌ USUARIO NO ENCONTRADO');
          await Swal.fire({
            icon: 'error',
            title: '¡Desconocido!',
            text: 'El código QR no pertenece a ningún registro.',
            confirmButtonColor: '#ef4444',
            background: '#1e293b',
            color: '#fff'
          });
          setIsScanning(false);
          return;
        }

        if (p.estatus_pago !== 'aprobado') {
          setStatus('⛔ ACCESO DENEGADO');
          await Swal.fire({
            icon: 'warning',
            title: 'Acceso Denegado',
            text: `${p.nombre_completo} NO ha validado su pago.`,
            confirmButtonColor: '#f59e0b',
            background: '#1e293b',
            color: '#fff'
          });
          setIsScanning(false);
          return;
        }

        const { data: yaEntro } = await supabase
          .from('control_asistencia')
          .select('*')
          .eq('participante_id', decodedText)
          .eq('dia_numero', diaActual)
          .single();

        if (yaEntro) {
          setStatus('🚨 QR YA UTILIZADO HOY');
          await Swal.fire({
            icon: 'info',
            title: '¡Ya ingresó!',
            text: `${p.nombre_completo} ya registró asistencia el día ${diaActual}.`,
            confirmButtonColor: '#3b82f6',
            background: '#1e293b',
            color: '#fff'
          });
        } else {
          await supabase.from('control_asistencia').insert([
            { participante_id: decodedText, dia_numero: diaActual }
          ]);
          setStatus('✅ ACCESO REGISTRADO');
          await Swal.fire({
            icon: 'success',
            title: '¡Bienvenido/a!',
            text: `${p.nombre_completo}\nAcceso registrado día ${diaActual}`,
            timer: 2000,
            showConfirmButton: false,
            background: '#1e293b',
            color: '#fff'
          });
        }

      } catch (err) {
        console.error(err);
        setStatus('❌ ERROR DE CONEXIÓN');
      } finally {
        setIsScanning(false);
        setStatus('Listo para el siguiente...');
      }
    });

    return () => scanner.clear();
  }, [diaActual, isScanning]);

  return (
    <div className="bg-slate-800 p-8 rounded-[3rem] border border-slate-700 shadow-2xl w-full max-w-lg mx-auto text-center">
      
      {/* INICIO DEL BLOQUE DE ESTILOS FORZADOS */}
      <style>{`
        #reader {
          border: none !important;
        }
        #reader__dashboard_section_csr button, 
        #reader__dashboard_section_csr span,
        #reader__camera_selection,
        #reader__dashboard_section_fs a,
        .html5-qrcode-element {
          color: #1A1A1A !important;
          text-decoration: none !important;
          font-family: sans-serif !important;
          font-weight: bold !important;
          font-size: 14px !important;
        }
        #reader img {
          display: block;
          margin: 0 auto 10px auto;
        }
        #reader button {
          background-color: #f3f4f6 !important;
          border: 1px solid #ccc !important;
          padding: 8px 12px !important;
          border-radius: 8px !important;
          margin: 10px auto !important;
          cursor: pointer !important;
        }
      `}</style>
      {/* FIN DEL BLOQUE DE ESTILOS */}

      <h2 className="text-3xl font-black mb-6 text-white uppercase italic tracking-tighter">
        Escáner <span className="text-emerald-500 text-3xl">Staff</span>
      </h2>
      
      {/* ... resto de tu código de los botones DÍA 1, 2, 3 ... */}

      <div className="flex gap-2 mb-8 bg-slate-900 p-1.5 rounded-2xl border border-slate-700 shadow-inner">
        {[1, 2, 3].map(d => (
          <button 
            key={d} 
            onClick={() => setDiaActual(d)} 
            className={`flex-1 py-4 rounded-xl font-black transition-all text-xs tracking-widest ${diaActual === d ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            DÍA {d}
          </button>
        ))}
      </div>

      <div id="reader" className="mx-auto overflow-hidden rounded-[2.5rem] border-8 border-slate-900 bg-white shadow-2xl max-w-sm p-4"></div>
      
      <p className={`mt-8 font-black uppercase tracking-[0.3em] text-[10px] transition-colors ${
        status.includes('✅') ? 'text-emerald-400' : 
        status.includes('❌') || status.includes('🚨') || status.includes('⛔') ? 'text-rose-500' : 
        'text-slate-500'
      }`}>
        {status}
      </p>
    </div>
  );
}

export default Scanner;