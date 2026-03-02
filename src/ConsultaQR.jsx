import { useState } from 'react';
import { supabase } from './lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

function ConsultaQR() {
  const [matricula, setMatricula] = useState('');
  const [participante, setParticipante] = useState(null);
  const [error, setError] = useState('');

  const consultar = async () => {
    setError('');
    const { data, error: dbError } = await supabase
      .from('participantes')
      .select('*')
      .eq('matricula', matricula)
      .single();

    if (dbError || !data) {
      setError('No se encontró ningún registro con esa matrícula.');
      setParticipante(null);
    } else {
      setParticipante(data);
    }
  };

  return (
    /* Contenedor principal: Mantiene su fondo oscuro */
    <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl text-center w-full max-w-md mx-auto animate-in fade-in relative overflow-hidden">
      
      <h2 className="text-3xl font-black mb-2 text-white uppercase italic tracking-tighter">
        Obtener <span className="text-[#32B58C]">mi pase</span>
      </h2>
      <p className="text-slate-500 mb-8 text-[10px] font-black tracking-widest uppercase">Consulta tu estatus y descarga tu QR</p>
      
      <div className="space-y-4">
        <input 
          type="text" 
          placeholder="MATRÍCULA / ID"
          className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 text-center font-black outline-none focus:border-[#32B58C] transition-all shadow-inner"
          onChange={(e) => setMatricula(e.target.value)}
        />
        <button 
          onClick={consultar} 
          className="w-full py-5 bg-[#007D5F] text-white rounded-2xl font-black shadow-xl shadow-[#007D5F]/20 hover:bg-[#32B58C] hover:scale-[1.02] transition-all"
        >
          CONSULTAR REGISTRO
        </button>
      </div>

      {error && <p className="mt-6 text-red-400 font-bold text-sm bg-red-900/20 p-4 rounded-xl border border-red-500/20">{error}</p>}

      {participante && (
        <div className="mt-10 p-8 bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in text-slate-900">
          <p className="text-[10px] font-black text-[#007D5F] uppercase tracking-widest mb-1">Pase Oficial Digital</p>
          <h3 className="text-2xl font-black uppercase mb-6 tracking-tighter">{participante.nombre_completo}</h3>
          
          <div className="flex justify-center mb-6 p-4 border-2 border-slate-100 rounded-3xl">
            <QRCodeSVG value={participante.id} size={200} />
          </div>
          
          <p className={`font-black uppercase text-[10px] tracking-widest p-3 rounded-full ${
            participante.estatus_pago === 'aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600 animate-pulse'
          }`}>
            {participante.estatus_pago === 'aprobado' ? '✓ Acceso Autorizado' : '⌛ Pago en Revisión'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ConsultaQR;