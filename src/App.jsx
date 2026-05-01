import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Scanner from './Scanner'
import Admin from './Admin'
import ConsultaQR from './ConsultaQR'
import Swal from 'sweetalert2'

// ✅ CORRECCIÓN: contraseña leída desde variable de entorno, nunca hardcodeada.
const ACCESS_PASSWORD = import.meta.env.VITE_STAFF_PASSWORD;

function ScannerProtector() {
  const [isStaff, setIsStaff] = useState(false);
  const [pass, setPass] = useState('');

  const verificarAcceso = () => {
    if (pass === ACCESS_PASSWORD) {
      setIsStaff(true);
    } else {
      Swal.fire({ icon: 'error', title: 'Acceso Denegado', text: 'Clave incorrecta', confirmButtonColor: '#007D5F' });
    }
  };

  if (!isStaff) {
    return (
      <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5DCC5] shadow-xl text-center animate-in zoom-in w-full max-w-sm mx-auto relative z-10">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-2xl font-black mb-2 text-[#007D5F]">Acceso Staff</h2>
        <p className="text-slate-500 text-sm mb-6">Inicia el escáner biométrico de pases QR.</p>
        <input
          type="password"
          placeholder="Clave de Seguridad"
          className="w-full p-4 rounded-2xl bg-[#FDF5E6] border border-[#E5DCC5] text-slate-800 mb-4 text-center outline-none focus:ring-2 focus:ring-[#32B58C] transition-all"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && verificarAcceso()}
        />
        <button
          onClick={verificarAcceso}
          className="w-full bg-[#007D5F] text-white p-4 rounded-2xl font-black hover:bg-[#32B58C] transition-all shadow-md"
        >
          Activar Cámara
        </button>
      </div>
    );
  }
  return <Scanner />;
}

function App() {
  const [view, setView] = useState('landing');
  const [nombre, setNombre] = useState('');
  const [ponenciaCartel, setPonenciaCartel] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [correo, setCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [tipoParticipacion, setTipoParticipacion] = useState('Asistente');
  const [modalidadAsistencia, setModalidadAsistencia] = useState('presencial');

  // ✅ NUEVO: atajo de teclado oculto para acceder a Admin y Staff.
  // Los botones del footer desaparecen; solo quien conoce el atajo puede acceder.
  // Ctrl + Shift + A  →  Panel Admin
  // Ctrl + Shift + S  →  Panel Staff / Scanner
  useEffect(() => {
    const manejarAtajo = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setView('admin');
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setView('scanner');
      }
    };
    window.addEventListener('keydown', manejarAtajo);
    return () => window.removeEventListener('keydown', manejarAtajo);
  }, []);

  const manejarRegistro = async () => {
    if (!nombre || !institucion || !correo || !confirmarCorreo || !archivo) {
      return Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, llena los campos obligatorios (*) y sube tu comprobante.',
        confirmButtonColor: '#007D5F'
      });
    }

    if (correo.trim().toLowerCase() !== confirmarCorreo.trim().toLowerCase()) {
      return Swal.fire({
        icon: 'error',
        title: 'Correos no coinciden',
        text: 'Los correos electrónicos ingresados no son iguales.',
        confirmButtonColor: '#007D5F'
      });
    }

    setCargando(true);

    try {
      const nombreLimpio = nombre.trim();
      const correoLimpio = correo.trim().toLowerCase();

      const { data: existente } = await supabase
        .from('participantes')
        .select('id')
        .eq('correo', correoLimpio)
        .maybeSingle();

      if (existente) {
        setCargando(false);
        return Swal.fire({
          icon: 'info',
          title: 'Registro ya existe',
          text: 'Este correo ya tiene un registro. Usa "Obtener mi QR" para ver tu pase.',
          confirmButtonColor: '#007D5F'
        });
      }

      const extension = archivo.name.split('.').pop();
      const nombreArchivo = `comp_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(nombreArchivo, archivo);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(nombreArchivo);

      const idInterno = `COI-${Date.now()}`;

      const { error: dbError } = await supabase.from('participantes').insert([{
        nombre_completo: nombreLimpio,
        matricula: idInterno,
        ponencia_cartel: ponenciaCartel.trim() || 'N/A',
        institucion: institucion.trim(),
        correo: correoLimpio,
        tipo_participacion: tipoParticipacion,
        modalidad: modalidadAsistencia,
        tiene_hospedaje: false,
        detalle_hospedaje: 'N/A',
        url_comprobante: urlData.publicUrl,
        estatus_pago: 'pendiente'
      }]);

      if (dbError) throw dbError;

      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: 'Validaremos tu pago en las próximas horas.',
        confirmButtonColor: '#007D5F'
      });

      setNombre(''); setPonenciaCartel(''); setCorreo(''); setConfirmarCorreo('');
      setInstitucion(''); setArchivo(null);
      setView('landing');

    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Hubo un error', text: error.message });
    } finally { setCargando(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDF5E6] text-slate-800 font-sans selection:bg-[#F2B705] selection:text-black overflow-x-hidden flex flex-col">
      <nav className="p-6 flex justify-between items-center relative z-20 border-b border-[#E5DCC5] bg-white">
        <button onClick={() => setView('landing')} className="hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="COICAC Logo" className="h-14 w-auto object-contain" />
        </button>
      </nav>

      <main className="flex-grow">
        {view === 'landing' && (
          <div className="animate-in fade-in duration-1000">
            <section className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center gap-12 relative z-10">
              <div className="md:w-3/5 text-center md:text-left">
                <h1 className="text-5xl md:text-7xl font-black leading-[0.9] mb-6 tracking-tighter italic text-slate-900">
                  CONGRESO INTERNACIONAL <br />
                  <span className="text-[#007D5F] not-italic">DE CUERPOS ACADEMICOS UTD.</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl font-medium">
                  Regístrate, sube tu comprobante y obtén tu acceso digital para el evento de tecnología más esperado.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
                  <button onClick={() => setView('consulta')} className="bg-[#F2B705] text-black px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:-translate-y-1 transition-all">
                    OBTENER MI QR
                  </button>
                </div>
              </div>
              <div className="md:w-2/5 flex justify-center">
                <div className="w-full max-w-md aspect-[4/3] rounded-[3rem] border-4 border-[#32B58C] overflow-hidden shadow-2xl bg-white">
                  <img src="/utd-campus-bg.jpg" alt="Campus UTD" className="w-full h-full object-cover" />
                </div>
              </div>
            </section>

            <section className="py-20 px-6 bg-[#F5E9D3] border-y border-[#E5DCC5]">
              <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-4xl font-black mb-16 uppercase italic tracking-widest text-[#007D5F]/60">Selecciona tu participación</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {['Ponente', 'Asistente', 'Cartel'].map((tipo) => (
                    <div key={tipo} className={`p-10 rounded-[2.5rem] border transition-all relative ${tipo === 'Asistente' ? 'bg-[#007D5F] text-white scale-105 shadow-2xl border-[#32B58C]' : 'bg-white border-[#E5DCC5]'}`}>
                      {tipo === 'Asistente' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#F2B705] text-black text-[11px] font-black px-6 py-2 rounded-full uppercase">MÁS POPULAR</div>}
                      <div className="text-5xl mb-6">{tipo === 'Ponente' ? '🎙️' : tipo === 'Asistente' ? '👥' : '🖼️'}</div>
                      <h3 className="text-3xl font-black mb-4 uppercase">{tipo}</h3>
                      <button onClick={() => { setTipoParticipacion(tipo); setView('generator'); }} className={`w-full py-4 rounded-2xl font-black transition-all ${tipo === 'Asistente' ? 'bg-white text-[#007D5F] hover:bg-[#F2B705] hover:text-black' : 'bg-[#FDF5E6] text-[#007D5F] border border-[#007D5F] hover:bg-[#007D5F] hover:text-white'}`}>
                        INSCRIBIRSE
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center justify-center min-h-[60vh]">
          {view !== 'landing' && (
            <button onClick={() => setView('landing')} className="mb-10 font-bold text-[#007D5F] hover:text-[#32B58C] transition-all flex items-center gap-2 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> VOLVER AL INICIO
            </button>
          )}

          {view === 'generator' && (
            <div className="w-full max-w-lg bg-white p-10 rounded-[3rem] border border-[#E5DCC5] shadow-2xl animate-in slide-in-from-bottom-5">
              <h2 className="text-4xl font-black mb-2 italic tracking-tighter uppercase text-slate-900">Registro <span className="text-[#007D5F]">{tipoParticipacion}</span></h2>
              <p className="text-slate-400 mb-8 font-bold text-xs tracking-widest uppercase">Datos oficiales</p>

              <div className="space-y-6 text-left">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Nombre Completo <span className="text-red-500">*</span></label>
                  <input type="text" value={nombre} placeholder="Ej. Juan Pérez" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20" onChange={(e) => setNombre(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Institución de Procedencia <span className="text-red-500">*</span></label>
                  <input type="text" value={institucion} placeholder="Ej. UTD, ITD, UNAM" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20" onChange={(e) => setInstitucion(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Nombre de Ponencia o Cartel (Opcional)</label>
                  <input type="text" value={ponenciaCartel} placeholder="Título de tu trabajo" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none" onChange={(e) => setPonenciaCartel(e.target.value)} />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Modalidad de Asistencia</label>
                  <select className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none" onChange={(e) => setModalidadAsistencia(e.target.value)}>
                    <option value="presencial">PRESENCIAL</option>
                    <option value="virtual">VIRTUAL</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2 text-[9px]">Correo Electrónico *</label>
                    <input type="email" value={correo} placeholder="correo@ej" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-4 rounded-2xl outline-none" onChange={(e) => setCorreo(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2 text-[9px]">Confirmar Correo *</label>
                    <input type="email" value={confirmarCorreo} placeholder="repite correo" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-4 rounded-2xl outline-none" onChange={(e) => setConfirmarCorreo(e.target.value)} />
                  </div>
                </div>

                <div className="bg-[#FDF5E6] p-6 rounded-2xl border-2 border-dashed border-[#E5DCC5] text-center">
                  <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Comprobante de Pago *</label>
                  <input type="file" accept="image/*" className="text-[10px]" onChange={(e) => setArchivo(e.target.files[0])} />
                </div>

                <button onClick={manejarRegistro} disabled={cargando} className="w-full py-6 bg-[#007D5F] text-white rounded-2xl font-black shadow-xl active:scale-95 transition-all uppercase hover:bg-[#32B58C]">
                  {cargando ? "ENVIANDO..." : "FINALIZAR REGISTRO"}
                </button>
              </div>
            </div>
          )}

          {view === 'consulta' && <ConsultaQR />}
          {view === 'admin' && <Admin />}
          {view === 'scanner' && <ScannerProtector />}
        </div>
      </main>

      {/* ✅ CORRECCIÓN: botones Admin y Staff eliminados del footer público.
          Acceso solo via atajo de teclado: Ctrl+Shift+A (Admin) / Ctrl+Shift+S (Staff) */}
      <footer className="w-full py-10 border-t border-[#E5DCC5] bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase">© 2026 Universidad Tecnológica de Durango</p>
        </div>
      </footer>
    </div>
  )
}

export default App;