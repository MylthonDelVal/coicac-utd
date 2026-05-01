import { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import emailjs from '@emailjs/browser';
import Swal from 'sweetalert2';

emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

// ✅ CORRECCIÓN: FilterSelector definido FUERA del componente Admin
// para evitar que React lo desmonte/monte en cada render.
const FilterSelector = ({ label, value, onChange, options }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-2">{label}</label>
    <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
            value === opt.value
            ? 'bg-blue-600 text-white shadow'
            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);

// ✅ Helper para normalizar texto: quita acentos y pasa a minúsculas
// Así "José" y "jose" coinciden, y "García" y "garcia" también.
const normalizar = (str) =>
  (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function Admin() {
  const [participantes, setParticipantes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pass, setPass] = useState('');
  const [isLoading, setIsLoading] = useState(false); // ✅ NUEVO: estado de carga

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroModalidad, setFiltroModalidad] = useState('todos');
  const [filtroPago, setFiltroPago] = useState('todos');

  useEffect(() => {
    if (isAuthenticated) obtenerParticipantes();
  }, [isAuthenticated]);

  const obtenerParticipantes = async () => {
    setIsLoading(true); // ✅ Inicia el loading
    const { data, error } = await supabase
      .from('participantes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error:", error);
    else setParticipantes(data || []);
    setIsLoading(false); // ✅ Termina el loading
  };

  const enviarCorreoQR = async (participante) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${participante.id}`;
    const templateParams = {
      nombre_alumno: participante.nombre_completo,
      matricula: participante.matricula,
      email_destinatario: participante.correo,
      qr_link: qrUrl,
    };
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      return true;
    } catch (error) { console.error("Error:", error); return false; }
  };

  const cambiarEstatus = async (participante, nuevoEstatus) => {
    const { error } = await supabase.from('participantes').update({ estatus_pago: nuevoEstatus }).eq('id', participante.id);
    if (!error) {
      if (nuevoEstatus === 'aprobado') {
        Swal.fire({ title: 'Enviando QR...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        const enviado = await enviarCorreoQR(participante);
        if (enviado) {
          Swal.fire({ icon: 'success', title: '¡Aprobado!', background: '#1e293b', color: '#fff' });
        } else {
          Swal.fire({ icon: 'warning', title: 'Error correo', background: '#1e293b', color: '#fff' });
        }
      }
      obtenerParticipantes();
    }
  };

  // ✅ CORRECCIÓN: búsqueda normalizada (ignora acentos y mayúsculas)
  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return participantes.filter(p => {
      const cumpleBusqueda =
        normalizar(p.nombre_completo).includes(q) ||
        normalizar(p.matricula).includes(q) ||
        normalizar(p.correo).includes(q) ||
        normalizar(p.ponencia_cartel).includes(q) ||
        normalizar(p.institucion).includes(q);

      if (!cumpleBusqueda) return false;
      if (filtroTipo !== 'todos' && p.tipo_participacion !== filtroTipo) return false;
      if (filtroModalidad !== 'todos' && p.modalidad !== filtroModalidad) return false;
      if (filtroPago !== 'todos' && p.estatus_pago !== filtroPago) return false;

      return true;
    });
  }, [participantes, busqueda, filtroTipo, filtroModalidad, filtroPago]);

  // ✅ NUEVO: exportar los registros filtrados a CSV
  const exportarCSV = () => {
    if (filtrados.length === 0) return;

    const encabezados = ['Nombre', 'Correo', 'Institución', 'Tipo', 'Modalidad', 'Estatus Pago', 'Ponencia/Cartel', 'Matrícula', 'Fecha Registro'];
    const filas = filtrados.map(p => [
      p.nombre_completo,
      p.correo,
      p.institucion,
      p.tipo_participacion,
      p.modalidad,
      p.estatus_pago,
      p.ponencia_cartel || 'N/A',
      p.matricula,
      new Date(p.created_at).toLocaleDateString('es-MX'),
    ]);

    const contenidoCSV = [encabezados, ...filas]
      .map(fila => fila.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coicac_participantes_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalPresencial = participantes.filter(p => p.modalidad === 'presencial').length;
  const totalPonencias = participantes.filter(p => p.ponencia_cartel && p.ponencia_cartel !== 'N/A').length;

  // --- Pantalla de login ---
  if (!isAuthenticated) {
    return (
      <div className="bg-slate-800 p-12 rounded-[3rem] border border-slate-700 shadow-2xl text-center w-full max-w-sm mx-auto animate-in zoom-in">
        <div className="text-5xl mb-6">🔐</div>
        <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter">Panel Central</h2>
        <input
          type="password" placeholder="Clave Maestra"
          className="w-full p-5 rounded-2xl bg-slate-900 border border-slate-700 text-white mb-4 text-center outline-none focus:ring-2 focus:ring-blue-500"
          value={pass} onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            pass === import.meta.env.VITE_ADMIN_PASSWORD
              ? setIsAuthenticated(true)
              : alert("❌ Clave incorrecta");
          }}
        />
        <button
          onClick={() =>
            pass === import.meta.env.VITE_ADMIN_PASSWORD
              ? setIsAuthenticated(true)
              : alert("❌ Clave incorrecta")
          }
          className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-blue-900/40"
        >
          ACCEDER
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-700 shadow-2xl w-full max-w-7xl mx-auto overflow-hidden text-white">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-6">
        <h2 className="text-4xl font-black italic uppercase tracking-tighter">Panel <span className="text-blue-500">Admin</span></h2>
        <div className="flex w-full md:w-auto gap-2">
          <input
            type="text" placeholder="🔍 Buscar nombre, cartel, correo..."
            className="bg-slate-900 border border-slate-700 p-5 rounded-2xl w-full md:w-80 text-white outline-none focus:border-blue-500 shadow-inner"
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {/* ✅ NUEVO: botón exportar CSV */}
          <button
            onClick={exportarCSV}
            title="Exportar a CSV"
            className="p-5 rounded-2xl border bg-slate-900 border-slate-700 hover:border-emerald-500 hover:text-emerald-400 transition-all"
          >
            📥
          </button>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`p-5 rounded-2xl border transition-all ${mostrarFiltros ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
          >
            🎛️
          </button>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
          <FilterSelector
            label="Tipo de Participación"
            value={filtroTipo}
            onChange={setFiltroTipo}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: '🎙️ Ponente', value: 'Ponente' },
              { label: '👥 Asistente', value: 'Asistente' },
              { label: '🖼️ Cartel', value: 'Cartel' }
            ]}
          />
          <FilterSelector
            label="Modalidad"
            value={filtroModalidad}
            onChange={setFiltroModalidad}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: '🏢 Presencial', value: 'presencial' },
              { label: '💻 Virtual', value: 'virtual' }
            ]}
          />
          <FilterSelector
            label="Pago"
            value={filtroPago}
            onChange={setFiltroPago}
            options={[
              { label: 'Todos', value: 'todos' },
              { label: '💰 Pagado', value: 'aprobado' },
              { label: '⏳ Pendiente', value: 'pendiente' }
            ]}
          />
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Registros</p>
          <p className="text-2xl font-black text-white">{participantes.length}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">🏢 Presenciales</p>
          <p className="text-2xl font-black text-emerald-400">{totalPresencial}</p>
        </div>
        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">🎙️ Trabajos/Ponencias</p>
          <p className="text-2xl font-black text-blue-400">{totalPonencias}</p>
        </div>
      </div>

      {/* ✅ NUEVO: indicador de carga */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Cargando participantes...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-700/50">
                <th className="p-5">Alumno / Institución</th>
                <th className="p-5">Ponencia / Cartel</th>
                <th className="p-5">Participación</th>
                <th className="p-5">Comprobante</th>
                <th className="p-5">Estatus</th>
                <th className="p-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-500 text-sm font-black uppercase tracking-widest">
                    Sin resultados para la búsqueda actual
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/20 transition-all group">
                    <td className="p-5">
                      <p className="font-black uppercase text-sm text-white">{p.nombre_completo}</p>
                      <p className="text-[10px] text-blue-400 font-bold lowercase italic">{p.correo}</p>
                      <p className="text-[10px] text-slate-500 font-black uppercase mt-1">🏫 {p.institucion}</p>
                    </td>
                    <td className="p-5">
                      <p className="text-[11px] font-bold text-slate-300 uppercase max-w-[200px] break-words">
                        {p.ponencia_cartel && p.ponencia_cartel !== 'N/A' ? p.ponencia_cartel : '—'}
                      </p>
                    </td>
                    <td className="p-5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase">
                          {p.tipo_participacion}
                        </span>
                        <span className="text-[8px] font-black text-slate-500 uppercase ml-1">
                          {p.modalidad}
                        </span>
                      </div>
                    </td>
                    <td className="p-5">
                      <a href={p.url_comprobante} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-300 font-black text-[10px] uppercase underline underline-offset-4">VER TICKET ↗</a>
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
                        <button onClick={() => cambiarEstatus(p, 'aprobado')} className="p-3 bg-emerald-600 rounded-xl hover:scale-110 transition-transform">✅</button>
                        <button onClick={() => cambiarEstatus(p, 'rechazado')} className="p-3 bg-red-600 rounded-xl hover:scale-110 transition-transform">❌</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Admin;