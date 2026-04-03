import { useState } from 'react';
import { supabase } from './lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2'; 

function ConsultaQR() {
  const [busqueda, setBusqueda] = useState('');
  const [participante, setParticipante] = useState(null);
  const [listaRegistros, setListaRegistros] = useState([]); 
  const [cargando, setCargando] = useState(false);

  const consultar = async () => {
    // Limpiamos la búsqueda: sin espacios y en minúsculas
    const busquedaLimpia = busqueda.trim().toLowerCase();
    
    if (!busquedaLimpia) {
        return Swal.fire({
            icon: 'info',
            title: 'Campo vacío',
            text: 'Por favor ingresa tu correo o matrícula.',
            confirmButtonColor: '#007D5F'
        });
    }

    setCargando(true);
    setParticipante(null);
    setListaRegistros([]);
    
    try {
        // Buscamos en la base de datos
        const { data, error: dbError } = await supabase
          .from('participantes')
          .select('*')
          .or(`correo.eq.${busquedaLimpia},matricula.eq.${busquedaLimpia}`)
          .order('created_at', { ascending: false });

        if (dbError || !data || data.length === 0) {
          // Reintento: búsqueda exacta solo por correo por si el .or dio problemas
          const { data: dataReintento } = await supabase
            .from('participantes')
            .select('*')
            .eq('correo', busquedaLimpia);
            
          if (!dataReintento || dataReintento.length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'No encontrado',
                text: 'No hay registros con esos datos. Asegúrate de usar el correo exacto con el que te registraste.',
                confirmButtonColor: '#007D5F'
            });
            setCargando(false);
            return;
          }
          
          if (dataReintento.length === 1) setParticipante(dataReintento[0]);
          else setListaRegistros(dataReintento);
          
        } else {
          // Si encontró registros
          if (data.length === 1) setParticipante(data[0]);
          else setListaRegistros(data);
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: err.message });
    } finally {
        setCargando(false);
    }
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
          value={busqueda}
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

      {/* Selector de registros */}
      {listaRegistros.length > 1 && !participante && (
        <div className="mt-8 space-y-3 animate-in slide-in-from-top-4">
          <p className="text-white text-xs font-black uppercase mb-4 tracking-widest">Registros encontrados:</p>
          {listaRegistros.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setParticipante(reg)}
              className="w-full p-4 bg-slate-900 border border-slate-700 rounded-2xl text-left hover:border-[#32B58C] transition-all group"
            >
              <p className="text-[#32B58C] font-black uppercase text-sm group-hover:scale-[1.02] transition-transform">{reg.nombre_completo}</p>
              <p className="text-slate-500 text-[9px] font-bold mt-1 uppercase">
                {new Date(reg.created_at).toLocaleDateString()} - {reg.estatus_pago}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Vista del QR */}
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
                  QR SE ACTIVARÁ AL <br /> 
                  <span className="text-[#007D5F]">VALIDAR TU PAGO</span>
                </p>
              </div>
            )}
          </div>
          
          <p className={`font-black uppercase text-[10px] tracking-widest p-3 rounded-full ${
            participante.estatus_pago === 'aprobado' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {participante.estatus_pago === 'aprobado' ? '✓ Acceso Autorizado' : '⌛ Pago en Revisión'}
          </p>

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