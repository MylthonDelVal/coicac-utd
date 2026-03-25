import { useState } from 'react';
import { supabase } from './lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

function ConsultaQR() {
  const [busqueda, setBusqueda] = useState('');
  const [participante, setParticipante] = useState(null); // Registro seleccionado
  const [listaRegistros, setListaRegistros] = useState([]); // Nueva lista para múltiples resultados
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const consultar = async () => {
    if (!busqueda) return setError('Por favor ingresa tu correo o matrícula.');
    
    setError('');
    setCargando(true);
    setParticipante(null);
    setListaRegistros([]);
    
    // 1. Quitamos .maybeSingle() para que nos traiga TODOS los que coincidan
    const { data, error: dbError } = await supabase
      .from('participantes')
      .select('*')
      .or(`matricula.eq.${busqueda},correo.eq.${busqueda}`)
      .order('created_at', { ascending: false }); 

    if (dbError || !data || data.length === 0) {
      setError('No se encontró ningún registro con esos datos. Verifica que el correo sea el mismo que registraste.');
      setCargando(false);
      return;
    }

    // 2. Si solo hay uno, lo mostramos directo como antes
    if (data.length === 1) {
      setParticipante(data[0]);
    } else {
      // 3. Si hay varios, guardamos la lista para que el usuario elija
      setListaRegistros(data);
    }
    
    setCargando(false);
  };

  return (
    <div className="bg-slate-800 p-10 rounded-[3rem] border border-slate-700 shadow-2xl text-center w-full max-w-md mx-auto animate-in fade-in relative overflow-hidden">
      
      <h2 className="text-3xl font-black mb-2 text-white uppercase italic tracking-tighter">
        Obtener <span className="text-[#32B58C]">mi pase</span>
      </h2>
      <p className="text-slate-500 mb-8 text-[10px] font-black tracking-widest uppercase">Consulta con tu Correo o Matrícula</p>
      
      <div className="space-y-4">
        <input 
          type="text" 
          placeholder="CORREO O MATRÍCULA"
          className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 text-center font-black outline-none focus:border-[#32B58C] transition-all shadow-inner uppercase"
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && consultar()}
        />
        <button 
          onClick={consultar} 
          disabled={cargando}
          className="w-full py-5 bg-[#007D5F] text-white rounded-2xl font-black shadow-xl shadow-[#007D5F]/20 hover:bg-[#32B58C] hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {cargando ? "BUSCANDO..." : "CONSULTAR REGISTRO"}
        </button>
      </div>

      {error && <p className="mt-6 text-red-400 font-bold text-sm bg-red-900/20 p-4 rounded-xl border border-red-500/20">{error}</p>}

      {/* --- SELECTOR DE REGISTROS (Si hay varios) --- */}
      {listaRegistros.length > 1 && !participante && (
        <div className="mt-8 space-y-3 animate-in slide-in-from-top-4">
          <p className="text-white text-xs font-black uppercase mb-4 tracking-widest">Se encontraron {listaRegistros.length} registros:</p>
          {listaRegistros.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setParticipante(reg)}
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-left hover:border-[#32B58C] transition-all group"
            >
              <p className="text-[#32B58C] font-black uppercase text-sm group-hover:scale-[1.02] transition-transform">{reg.nombre_completo}</p>
              <p className="text-slate-500 text-[9px] font-bold mt-1 uppercase">
                Registro: {new Date(reg.created_at).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* --- VISTA DEL QR (Individual) --- */}
      {participante && (
        <div className="mt-10 p-8 bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in text-slate-900">
          <p className="text-[10px] font-black text-[#007D5F] uppercase tracking-widest mb-1">Estatus de Registro</p>
          <h3 className="text-2xl font-black uppercase mb-6 tracking-tighter leading-tight">{participante.nombre_completo}</h3>
          
          <div className="flex flex-col items-center justify-center mb-6 p-6 border-2 border-slate-100 rounded-3xl bg-slate-50">
            {participante.estatus_pago === 'aprobado' ? (
              <div className="animate-in fade-in duration-500">
                <QRCodeSVG value={participante.id} size={180} />
                <p className="mt-4 text-[9px] text-slate-400 font-bold">ID: {participante.id}</p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-5xl mb-4 opacity-20">🔒</div>
                <p className="text-slate-400 text-xs font-bold px-4 leading-relaxed">
                  TU CÓDIGO QR SE ACTIVARÁ <br /> 
                  <span className="text-[#007D5F]">EN CUANTO SE VALIDE TU PAGO</span>
                </p>
              </div>
            )}
          </div>
          
          <p className={`font-black uppercase text-[10px] tracking-widest p-3 rounded-full ${
            participante.estatus_pago === 'aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {participante.estatus_pago === 'aprobado' ? '✓ Acceso Autorizado' : '⌛ Pago en Revisión'}
          </p>

          {/* Botón para volver a la lista si hay múltiples registros */}
          {listaRegistros.length > 1 && (
            <button 
              onClick={() => setParticipante(null)}
              className="mt-6 text-[9px] font-black text-slate-400 hover:text-[#007D5F] uppercase tracking-[0.2em] transition-all"
            >
              ← Ver otros registros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ConsultaQR;