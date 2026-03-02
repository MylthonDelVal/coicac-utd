import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';

emailjs.init("-hrjleCd5-SSgiopy"); 

const ADMIN_PASSWORD = "1234";


function Admin() {
  const [participantes, setParticipantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pass, setPass] = useState('');

  useEffect(() => {
    if (isAuthenticated) obtenerParticipantes();
  }, [isAuthenticated]);

  const obtenerParticipantes = async () => {
    const { data, error } = await supabase
      .from('participantes')
      .select(`
        *,
        modalidades (
          nombre
        )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error("Error en relación:", error);
    else setParticipantes(data || []);
  };

  // --- FUNCIÓN PARA ENVIAR CORREO ---
  const enviarCorreoQR = async (participante) => {
    // Usamos el ID real para el QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${participante.id}`;

    const templateParams = {
      nombre_alumno: participante.nombre_completo, // Automático
      matricula: participante.matricula,           // Automático
      email_destinatario: participante.correo,    // Automático desde tu tabla
      qr_link: qrUrl,
    };

    try {
      await emailjs.send(
        'service_6w99m06', 
        'template_akms1dj', 
        templateParams, 
        'vSTxGak1fnVKocrd6' // <--- ASEGÚRATE DE QUE ESTA SEA LA QUE FUNCIONÓ
      );
      return true;
    } catch (error) {
      console.error("Error al enviar:", error);
      return false;
    }
  };
  const cambiarEstatus = async (participante, nuevoEstatus) => {
    const { error } = await supabase
      .from('participantes')
      .update({ estatus_pago: nuevoEstatus })
      .eq('id', participante.id);

    if (!error) {
      if (nuevoEstatus === 'aprobado') {
        // Mostrar aviso de que se está enviando el correo
        Swal.fire({
          title: 'Enviando QR...',
          text: 'Por favor espera un momento.',
          allowOutsideClick: false,
          didOpen: () => { Swal.showLoading(); }
        });

        const enviado = await enviarCorreoQR(participante);

        if (enviado) {
          Swal.fire({
            icon: 'success',
            title: '¡Aprobado!',
            text: `Se envió el código QR a ${participante.correo}`,
            background: '#1e293b',
            color: '#fff'
          });
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'Pago aprobado',
            text: 'El pago se aprobó, pero hubo un error al enviar el correo.',
            background: '#1e293b',
            color: '#fff'
          });
        }
      }
      obtenerParticipantes();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-800 p-12 rounded-[3rem] border border-slate-700 shadow-2xl text-center w-full max-w-sm mx-auto animate-in zoom-in">
        <div className="text-5xl mb-6">🔐</div>
        <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Panel Central</h2>
        <input 
          type="password" placeholder="Clave Maestra"
          className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-700 text-white mb-4 text-center outline-none focus:ring-2 focus:ring-blue-500"
          value={pass} onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (pass === ADMIN_PASSWORD ? setIsAuthenticated(true) : alert("❌"))}
        />
        <button onClick={() => pass === ADMIN_PASSWORD ? setIsAuthenticated(true) : alert("❌")} className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-blue-900/40">ACCEDER</button>
      </div>
    );
  }

  const filtrados = participantes.filter(p => 
    p.nombre_completo.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.matricula.includes(busqueda)
  );

  return (
    <div className="bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-700 shadow-2xl w-full max-w-6xl mx-auto overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Panel <span className="text-blue-500">Admin</span></h2>
        <input 
          type="text" placeholder="🔍 Buscar alumno..." 
          className="bg-slate-900 border border-slate-700 p-5 rounded-2xl w-full md:w-96 text-white outline-none focus:border-blue-500 shadow-inner" 
          onChange={(e) => setBusqueda(e.target.value)} 
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700/50">
              <th className="p-5">Alumno</th>
              <th className="p-5">Modalidad</th>
              <th className="p-5">Ticket</th>
              <th className="p-5">Estatus</th>
              <th className="p-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {filtrados.map((p) => (
              <tr key={p.id} className="hover:bg-slate-700/20 transition-all group">
                <td className="p-5 text-white">
                  <p className="font-black uppercase text-sm">{p.nombre_completo}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{p.matricula}</p>
                </td>
                <td className="p-5">
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest italic shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    {p.modalidades?.nombre || "Asistente"}
                  </span>
                </td>
                <td className="p-5">
                  <a href={p.url_comprobante} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-300 font-black text-[10px] uppercase underline decoration-2 underline-offset-4">VER ↗</a>
                </td>
                <td className="p-5">
                   <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     p.estatus_pago === 'aprobado' ? 'text-emerald-400 bg-emerald-900/20 border border-emerald-500/20' : 'text-amber-400 bg-amber-900/20 border border-amber-500/20'
                   }`}>
                     {p.estatus_pago}
                   </span>
                </td>
                <td className="p-5 text-right">
                  <div className="flex gap-2 justify-end">
                    {/* PASAMOS EL OBJETO 'p' COMPLETO EN LUGAR DE SOLO EL ID */}
                    <button onClick={() => cambiarEstatus(p, 'aprobado')} className="p-3 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-900/20 hover:scale-110 transition-transform">✅</button>
                    <button onClick={() => cambiarEstatus(p, 'rechazado')} className="p-3 bg-red-600 text-white rounded-xl shadow-lg shadow-red-900/20 hover:scale-110 transition-transform">❌</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Admin;