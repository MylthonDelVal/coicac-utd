import { useState } from 'react'
import { supabase } from './lib/supabase'
import Scanner from './Scanner'
import Admin from './Admin'
import ConsultaQR from './ConsultaQR'

const ACCESS_PASSWORD = "delval"; 

function ScannerProtector() {
  const [isStaff, setIsStaff] = useState(false);
  const [pass, setPass] = useState('');

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
          onKeyDown={(e) => e.key === 'Enter' && (pass === ACCESS_PASSWORD ? setIsStaff(true) : alert("❌ Clave incorrecta"))}
        />
        <button 
          onClick={() => pass === ACCESS_PASSWORD ? setIsStaff(true) : alert("❌ Clave incorrecta")}
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
  const [matricula, setMatricula] = useState('');
  const [escuela, setEscuela] = useState('');
  const [correo, setCorreo] = useState('');
  const [confirmarCorreo, setConfirmarCorreo] = useState(''); 
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [modalidad, setModalidad] = useState('Asistente');

  const manejarRegistro = async () => {
    
    if (!nombre || !escuela || !correo || !confirmarCorreo || !archivo) {
      return alert("Por favor, llena los campos obligatorios (*) y sube tu comprobante.");
    }

    // Validación de doble correo
    if (correo !== confirmarCorreo) {
      return alert("❌ Los correos electrónicos no coinciden.");
    }

    
    setCargando(true); 
    try {
      const { data: existente, error: errorCheck } = await supabase
        .from('participantes')
        .select('id')
        .eq('correo', correo)
        .eq('nombre_completo', nombre)
        .maybeSingle();

      if (existente) {
        setCargando(false);
        return alert("⚠️ Ya existe un registro con este nombre y correo. Si no tienes tu QR, usa la opción 'Obtener mi QR'.");
      }
      const modalidadesMap = { 'Asistente': 1, 'Ponente': 2, 'Cartel': 3 };
      const extension = archivo.name.split('.').pop();
      // Si no hay matrícula, usamos el nombre para el archivo
      const idArchivo = matricula || nombre.replace(/\s+/g, '_').toLowerCase();
      const nombreArchivo = `${Date.now()}_${idArchivo}.${extension}`;
      
      const { error: uploadError } = await supabase.storage.from('comprobantes').upload(nombreArchivo, archivo);
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(nombreArchivo);
      
      
     


const matriculaFinal = matricula.trim() === "" 
      ? `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}` 
      : matricula;

    const { error: dbError } = await supabase.from('participantes').insert([{
      nombre_completo: nombre, 
      matricula: matriculaFinal, 
      escuela, 
      correo,
      modalidad_id: modalidadesMap[modalidad], 
      url_comprobante: urlData.publicUrl, 
      estatus_pago: 'pendiente'
    }]);

    if (dbError) throw dbError;
      alert("¡Registro enviado con éxito! Validaremos tu pago pronto.");
      setView('landing');
    } catch (error) { 
        alert("Error: " + error.message); 
    } finally { 
        setCargando(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#FDF5E6] text-slate-800 font-sans selection:bg-[#F2B705] selection:text-black overflow-x-hidden flex flex-col">
      <nav className="p-6 flex justify-between items-center relative z-20 border-b border-[#E5DCC5] bg-white">
        <button onClick={() => setView('landing')} className="hover:opacity-80 transition-opacity flex items-center">
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
                <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-xl font-medium leading-relaxed">
                  El congreso de tecnología más esperado por la UTD. Regístrate, sube tu comprobante y obtén tu acceso digital.
                </p>
                <div className="flex flex-col md:flex-row gap-4 justify-center md:justify-start">
                  <button 
                    onClick={() => setView('consulta')} 
                    className="bg-[#F2B705] text-black px-10 py-5 rounded-2xl font-black text-lg shadow-xl shadow-[#F2B705]/20 hover:-translate-y-1 transition-all active:scale-95"
                  >
                    OBTENER MI QR
                  </button>
                </div>
              </div>
              <div className="relative flex justify-center items-center md:w-2/5 mt-10 md:mt-0">
                <div className="relative w-full max-w-md aspect-[4/3] rounded-[3rem] border-4 border-[#32B58C] overflow-hidden shadow-2xl shadow-black/10 group bg-white">
                  <img src="/utd-campus-bg.jpg" alt="Campus UTD" className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700 ease-in-out" />
                </div>
              </div>
            </section>

            <section className="py-20 px-6 bg-[#F5E9D3] border-y border-[#E5DCC5]">
              <div className="max-w-7xl mx-auto text-center">
                <h2 className="text-4xl font-black mb-16 uppercase italic tracking-widest text-[#007D5F]/60">Selecciona tu participación</h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {/* PONENTE */}
                  <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5DCC5] hover:shadow-xl transition-all group">
                    <div className="text-5xl mb-6">🎙️</div>
                    <h3 className="text-3xl font-black mb-4 uppercase text-[#007D5F]">Ponente</h3>
                    <p className="text-slate-600 text-sm mb-8">Presenta tus trabajos ante la comunidad y obtén constancia oficial.</p>
                    <button onClick={() => { setModalidad('Ponente'); setView('generator'); }} className="w-full py-4 bg-[#FDF5E6] text-[#007D5F] border border-[#007D5F] rounded-2xl font-black hover:bg-[#007D5F] hover:text-white transition-all">INSCRIBIRSE</button>
                  </div>
                  {/* ASISTENTE */}
                  <div className="relative p-10 rounded-[3rem] bg-[#007D5F] border border-[#32B58C] shadow-2xl scale-105 z-10 text-white">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#F2B705] text-black text-[11px] font-black px-6 py-2 rounded-full shadow-lg uppercase">MÁS POPULAR</div>
                    <div className="text-5xl mb-6">👥</div>
                    <h3 className="text-3xl font-black mb-4 uppercase">Asistente</h3>
                    <p className="text-emerald-50 text-sm mb-8">Acceso total a conferencias magistrales, talleres y kit de bienvenida.</p>
                    <button onClick={() => { setModalidad('Asistente'); setView('generator'); }} className="w-full py-4 bg-white text-[#007D5F] rounded-2xl font-black hover:bg-[#F2B705] hover:text-black transition-all shadow-xl">INSCRIBIRSE</button>
                  </div>
                  {/* CARTEL */}
                  <div className="bg-white p-10 rounded-[2.5rem] border border-[#E5DCC5] hover:shadow-xl transition-all group">
                    <div className="text-5xl mb-6">🖼️</div>
                    <h3 className="text-3xl font-black mb-4 uppercase text-[#007D5F]">Cartel</h3>
                    <p className="text-slate-600 text-sm mb-8">Exhibe carteles científicos sobre tus proyectos en el área de exposición.</p>
                    <button onClick={() => { setModalidad('Cartel'); setView('generator'); }} className="w-full py-4 bg-[#FDF5E6] text-[#007D5F] border border-[#007D5F] rounded-2xl font-black hover:bg-[#007D5F] hover:text-white transition-all">INSCRIBIRSE</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col items-center justify-center min-h-[60vh] relative">
          {view !== 'landing' && (
            <button onClick={() => setView('landing')} className="mb-10 font-bold text-[#007D5F] hover:text-[#32B58C] transition-all flex items-center gap-2 group">
              <span className="group-hover:-translate-x-1 transition-transform">←</span> VOLVER AL INICIO
            </button>
          )}

          {view === 'generator' && (
            <div className="w-full max-w-lg bg-white p-10 rounded-[3rem] border border-[#E5DCC5] shadow-2xl animate-in slide-in-from-bottom-5 relative z-10">
              <h2 className="text-4xl font-black mb-2 italic tracking-tighter uppercase text-slate-900">Registro <span className="text-[#007D5F]">{modalidad}</span></h2>
              <p className="text-slate-400 mb-8 font-bold text-xs tracking-widest uppercase">Datos oficiales</p>
              
              <div className="space-y-6 text-left">
                {/* NOMBRE */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Nombre Completo <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Ej. Juan Pérez" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20 text-slate-800" onChange={(e) => setNombre(e.target.value)} />
                </div>

                {/* MATRICULA (OPCIONAL) */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Matrícula (Opcional)</label>
                  <input type="text" placeholder="Tu matrícula UTD" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20 text-slate-800" onChange={(e) => setMatricula(e.target.value)} />
                </div>

                {/* CORREO */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Correo Electrónico <span className="text-red-500">*</span></label>
                  <input type="email" placeholder="correo@ejemplo.com" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20 text-slate-800" onChange={(e) => setCorreo(e.target.value)} />
                </div>

                {/* CONFIRMAR CORREO */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Confirmar Correo <span className="text-red-500">*</span></label>
                  <input type="email" placeholder="Repite tu correo" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20 text-slate-800" onChange={(e) => setConfirmarCorreo(e.target.value)} />
                </div>

                {/* CARRERA */}
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase ml-2">Carrera / Especialidad <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Ej. TI Desarrollo de Software" className="w-full bg-[#FDF5E6] border border-[#E5DCC5] p-5 rounded-2xl outline-none focus:ring-2 focus:ring-[#007D5F]/20 text-slate-800" onChange={(e) => setEscuela(e.target.value)} />
                </div>

                {/* COMPROBANTE */}
                <div className="bg-[#FDF5E6] p-6 rounded-2xl border-2 border-dashed border-[#E5DCC5] text-center group hover:border-[#007D5F]/50 transition-all">
                  <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">Comprobante de Pago <span className="text-red-500">*</span></label>
                  <input type="file" accept="image/*" className="text-xs text-slate-400 file:bg-[#007D5F] file:text-white file:border-0 file:rounded-full file:px-4 file:py-2 file:font-bold file:mr-4 file:cursor-pointer" onChange={(e) => setArchivo(e.target.files[0])} />
                </div>

                <button onClick={manejarRegistro} disabled={cargando} className="w-full py-6 bg-[#007D5F] text-white rounded-2xl font-black shadow-xl shadow-[#007D5F]/20 active:scale-95 transition-all uppercase tracking-widest hover:bg-[#32B58C]">
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

      <footer className="w-full py-10 border-t border-[#E5DCC5] bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:row justify-between items-center gap-6 text-center md:text-left">
          <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase">© 2026 Universidad Tecnológica de Durango</p>
          <div className="flex gap-8">
            <button onClick={() => setView('scanner')} className="text-[10px] font-black text-slate-500 hover:text-[#007D5F] transition-all uppercase tracking-[0.2em]">🔒 Staff</button>
            <button onClick={() => setView('admin')} className="text-[10px] font-black text-slate-500 hover:text-[#F2B705] transition-all uppercase tracking-[0.2em]">⚙️ Admin</button>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App;