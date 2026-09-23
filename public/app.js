import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore, collection, query, where, getDocs, getDoc, updateDoc, addDoc, doc, setDoc, writeBatch, orderBy, limit, startAfter, limitToLast,
    endBefore, getCountFromServer, getAggregateFromServer, sum, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, onSnapshot, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración de proyecto
const firebaseConfig = {
    apiKey: "AIzaSyBg9o3wVZoA26Aob2RnbVPV8vGv4GE44gs",
    authDomain: "primer-proyecto-7b2f4.firebaseapp.com",
    projectId: "primer-proyecto-7b2f4",
    storageBucket: "primer-proyecto-7b2f4.firebasestorage.app",
    messagingSenderId: "627220736817",
    appId: "1:627220736817:web:a2eb4f187322c609f11e10"
};

// const app = initializeApp(firebaseConfig);

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

const auth = getAuth(app);
window.seriesEscaneadas = new Set();

const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const loginForm = document.getElementById('login-form');
const btnCerrarSesion = document.getElementById('btnCerrarSesion');
const togglePasswordBtn = document.getElementById('toggle-password');
const loginPassInput = document.getElementById('login-pass');

function resetearBotonLogin() {
    const btnEntrar = document.getElementById('btnEntrar');
    if (btnEntrar) {
        btnEntrar.disabled = false;
        btnEntrar.innerHTML = 'Entrar';
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {

            const docRef = doc(db, 'usuarios', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && (docSnap.data().rol === "Administrador" || docSnap.data().rol === "Operador")) {

                window.idUsuario = user.uid;
                window.rolUsuarioGlobal = docSnap.data().rol;
                loginScreen.classList.add('d-none');
                appContent.style.display = 'block';

                if (window.rolUsuarioGlobal === "Operador") {
                    document.getElementById("eliminarSeleccionadosLi").style.display = "block";
                    document.getElementById("eliminarSeleccionadosLiHr").style.display = "block";
                } else {
                    document.getElementById("eliminarSeleccionadosLi").style.display = "none";
                    document.getElementById("eliminarSeleccionadosLiHr").style.display = "none";
                }

                const btnUsuario = document.getElementById('btnUsuario');
                if (btnUsuario) {
                    const datosUsuario = docSnap.data();
                    const nombreParaMostrar = datosUsuario.nombre || user.email;

                    btnUsuario.innerHTML = `<i class="fa-solid fa-user-shield me-2"></i><span class="menu-text">${nombreParaMostrar}</span>`;
                }

                const modalPerfilInfo = new bootstrap.Modal(document.getElementById('modalPerfilInfo'));

                if (modalPerfilInfo) {
                    const datosUsuario = docSnap.data();
                    document.getElementById('txtNombrePerfil').innerText = datosUsuario.nombre || '';
                    document.getElementById('txtEmailPerfil').innerText = datosUsuario.email || '';
                    document.getElementById('txtRolPerfil').innerText = datosUsuario.rol || '';
                    const btnPerfilInfo = document.getElementById('btnUsuario');
                    btnPerfilInfo.addEventListener('click', () => {
                        modalPerfilInfo.show();
                    });
                }

                resetearBotonLogin();
                cargarInventario();
            } else {
                await signOut(auth);

                appContent.style.display = 'none';
                loginScreen.classList.remove('d-none');

                const errorDiv = document.getElementById('login-error');
                errorDiv.innerText = "Acceso Denegado: Tu cuenta no tiene privilegios de administrador";
                errorDiv.style.display = 'block';
                resetearBotonLogin();
            }
        } catch (error) {
            console.error("Error al verificar permisos", error);
            await signOut(auth);
            resetearBotonLogin();
        }
    } else {
        appContent.style.display = 'none';
        loginScreen.classList.remove('d-none');
        resetearBotonLogin();

        if (window.seriesSeleccionadasGlobal) {
            window.seriesSeleccionadasGlobal.clear();
            window.seleccionGlobal = false;
            if (typeof window.verificarSeleccion === 'function') window.verificarSeleccion();
        }
    }
});

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        const errorDiv = document.getElementById('login-error');

        errorDiv.style.display = 'none';

        const btnEntrar = document.getElementById('btnEntrar');
        if (btnEntrar) {
            btnEntrar.disabled = true;
            btnEntrar.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Verificando...';
        }

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            errorDiv.innerText = "Error: Credenciales inválidas";
            errorDiv.style.display = 'block';
            resetearBotonLogin();
        }
    });
}

if (togglePasswordBtn && loginPassInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = loginPassInput.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPassInput.setAttribute('type', type);

        const icon = togglePasswordBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        }
    });
}

if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmLogout = await Swal.fire({
            title: '¿Estás seguro de que deseas cerrar sesión?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#c71010ff',
            cancelButtonColor: '#999999ff',
            confirmButtonText: 'Cerrar Sesión',
            cancelButtonText: 'Cancelar'
        });
        if (confirmLogout.isConfirmed) {
            await signOut(auth);
        }
    });
}

function botonesSidebar() {
    const navLink = document.querySelectorAll('.nav-link');
    navLink.forEach(btn => {
        btn.addEventListener('click', () => {
            navLink.forEach(b => {
                b.classList.remove('active');
                b.classList.add('fw-boldk');
            });

            btn.classList.remove('fw-bold');
            btn.classList.add('active');
        });
    });
}

let ultimoDoc = null;
let primerDoc = null;
let paginaActual = 1;
const tamanoPagina = 50;
const modalCarga = new bootstrap.Modal(document.getElementById('modalEsperaImportacion'));
const modalLoading = new bootstrap.Modal(document.getElementById('modalLoading'));

const cuerpoTabla = document.getElementById('cuerpoTabla');
const btnBuscar = document.getElementById('btnBuscar');

window.seriesSeleccionadasGlobal = new Set();
window.seleccionGlobal = false;
window.evitarAutoGuardadoCotizacion = false;
window.modoCotizacionManual = false;

window.actualizarSeleccionIndividual = (checkbox) => {
    const tr = checkbox.closest('tr');
    if (checkbox.checked) {
        window.seriesSeleccionadasGlobal.add(checkbox.value);
        if (tr) {
            tr.style.backgroundColor = '#ddf3ff';
            tr.style.setProperty('--bs-table-bg', '#ddf3ff');
            tr.style.color = 'black';
            tr.style.setProperty('--bs-table-color', 'black');
            tr.style.setProperty('--bs-table-striped-color', 'black');
            tr.style.setProperty('--bs-table-hover-color', 'black');
        }
    } else {
        window.seriesSeleccionadasGlobal.delete(checkbox.value);
        window.seleccionGlobal = false;
        document.getElementById('chkSelectAll').checked = false;
        if (tr) {
            tr.style.backgroundColor = '';
            tr.style.removeProperty('--bs-table-bg');
            tr.style.color = '';
            tr.style.removeProperty('--bs-table-color');
            tr.style.removeProperty('--bs-table-striped-color');
            tr.style.removeProperty('--bs-table-hover-color');
        }
    }
    verificarSeleccion();
};

window.seleccionarFila = (serie, event) => {
    if (['BUTTON'].includes(event.target.tagName)) return;
    const checkbox = document.querySelector(`.check-registro[value="${serie}"]`);
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        window.actualizarSeleccionIndividual(checkbox);
    }
};

window.toggleSelectAll = async (source) => {
    const checkboxes = document.querySelectorAll('.check-registro');

    if (source.checked) {
        const respuestaResult = await Swal.fire({
            title: "¿Seleccionar todos los registros?",
            text: "¿Deseas seleccionar TODOS los registros de la base de datos que coinciden con tu filtro actual (incluyendo los de otras páginas)?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, Seleccionar TODOS",
            cancelButtonText: "Solo los de esta página"
        });

        if (respuestaResult.isConfirmed) {
            try {
                modalLoading.show();

                const categoriaFiltro = document.getElementById('filtroCategoria').value.trim().toLowerCase();
                const estatusFiltro = document.getElementById('filtroEstatus').value.trim().toLowerCase();
                const condicionFiltro = document.getElementById('filtroCondicion').value.trim().toLowerCase();
                const busqueda = document.getElementById('buscadorGeneral').value.trim().toLowerCase();

                window.seriesSeleccionadasGlobal.clear();

                (window.inventarioGlobal || []).forEach(data => {
                    const docId = data.serie || "";

                    const catDoc = String(data.categoria || '').trim().toLowerCase();
                    const estDoc = String(data.estatus || '').trim().toLowerCase();
                    const condDoc = String(data.condicion || '').trim().toLowerCase();

                    let pasaFiltros = true;

                    if (categoriaFiltro !== '' && catDoc !== categoriaFiltro) pasaFiltros = false;

                    if (estatusFiltro !== '') {
                        if (estatusFiltro === 'almacén' || estatusFiltro === 'almacen') {
                            if (estDoc !== 'almacén' && estDoc !== 'almacen') pasaFiltros = false;
                        } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                            if (estDoc !== 'en garantía' && estDoc !== 'en garantia') pasaFiltros = false;
                        } else {
                            if (estDoc !== estatusFiltro) pasaFiltros = false;
                        }
                    }

                    if (condicionFiltro !== '' && condDoc !== condicionFiltro) pasaFiltros = false;

                    if (pasaFiltros && window.seriesEscaneadas && window.seriesEscaneadas.size > 0) {
                        const serie = String(data.serie || docId).trim().toLowerCase();
                        if (!window.seriesEscaneadas.has(serie)) {
                            pasaFiltros = false;
                        }
                    } else if (pasaFiltros && busqueda !== '') {
                        const serie = String(data.serie || docId).toLowerCase();
                        const modelo = String(data.modelo || '').toLowerCase();
                        const marca = String(data.marca || '').toLowerCase();
                        const cliente = String(data.cliente || '').toLowerCase();
                        const lote = String(data.nLot || '').toLowerCase();

                        if (!serie.includes(busqueda) && !modelo.includes(busqueda) && !marca.includes(busqueda) && !cliente.includes(busqueda)) {
                            pasaFiltros = false;
                        }
                    }

                    if (pasaFiltros) {
                        window.seriesSeleccionadasGlobal.add(docId);
                    }
                });

                window.seleccionGlobal = true;
                checkboxes.forEach(cb => {
                    cb.checked = true;
                    const tr = cb.closest('tr');
                    if (tr) {
                        tr.style.backgroundColor = '#ddf3ff';
                        tr.style.setProperty('--bs-table-bg', '#ddf3ff');
                        tr.style.color = 'black';
                        tr.style.setProperty('--bs-table-color', 'black');
                        tr.style.setProperty('--bs-table-striped-color', 'black');
                        tr.style.setProperty('--bs-table-hover-color', 'black');
                    }
                });
                modalLoading.hide();
                await Swal.fire({
                    title: "Selección Completada",
                    text: `Se han seleccionado ${window.seriesSeleccionadasGlobal.size} registros en total.`,
                    icon: "success"
                });
            } catch (error) {
                console.error("Error al obtener todos los registros:", error);
                modalLoading.hide();
            }
        } else {
            window.seleccionGlobal = false;
            window.seriesSeleccionadasGlobal.clear();
            checkboxes.forEach(cb => {
                cb.checked = true;
                window.seriesSeleccionadasGlobal.add(cb.value);
                const tr = cb.closest('tr');
                if (tr) {
                    tr.style.backgroundColor = '#ddf3ff';
                    tr.style.setProperty('--bs-table-bg', '#ddf3ff');
                    tr.style.color = 'black';
                    tr.style.setProperty('--bs-table-color', 'black');
                    tr.style.setProperty('--bs-table-striped-color', 'black');
                    tr.style.setProperty('--bs-table-hover-color', 'black');
                }
            });
        }
    } else {
        window.seleccionGlobal = false;
        window.seriesSeleccionadasGlobal.clear();
        checkboxes.forEach(cb => {
            cb.checked = false;
            const tr = cb.closest('tr');
            if (tr) {
                tr.style.backgroundColor = '';
                tr.style.removeProperty('--bs-table-bg');
                tr.style.color = '';
                tr.style.removeProperty('--bs-table-color');
                tr.style.removeProperty('--bs-table-striped-color');
                tr.style.removeProperty('--bs-table-hover-color');
            }
        });
    }
    verificarSeleccion();
};

window.verificarSeleccion = () => {
    const btnAcciones = document.getElementById('btnAccionesMultiples');
    if (btnAcciones) {
        btnAcciones.disabled = window.seriesSeleccionadasGlobal.size === 0;
        if (window.seriesSeleccionadasGlobal.size > 0) {
            btnAcciones.innerHTML = `<i class="bi bi-list-check"></i> Acciones (${window.seriesSeleccionadasGlobal.size})`;
        } else {
            btnAcciones.innerHTML = `<i class="bi bi-list-check"></i> Acciones `;
        }
    }
    const badgeContenedor = document.getElementById('badgeContenedor');
    if (badgeContenedor) {
        const count = window.seriesSeleccionadasGlobal.size;
        badgeContenedor.innerText = count;
        badgeContenedor.style.display = count > 0 ? 'inline-block' : 'none';
    }
};

window.obtenerSeleccionados = () => {
    return Array.from(window.seriesSeleccionadasGlobal);
};

window.cerrarDropdownAcciones = () => {
    const btnAcciones = document.getElementById('btnAccionesMultiples');
    if (btnAcciones) {
        try {
            const dropdown = bootstrap.Dropdown.getOrCreateInstance(btnAcciones);
            if (dropdown) dropdown.hide();
        } catch (e) {
            console.error("Error al cerrar dropdown", e);
        }
    }
};

window.procesarTransicionGarantia = (itemActual, nuevoEstatus, fechaMovimiento, motivo, comentarios) => {
    if (!itemActual) return null;

    const estatusAnterior = String(itemActual.estatus || '').trim().toLowerCase();
    const estatusSiguiente = String(nuevoEstatus || '').trim().toLowerCase();

    const esGarantiaAnterior = estatusAnterior === 'en garantía' || estatusAnterior === 'en garantia';
    const esGarantiaSiguiente = estatusSiguiente === 'en garantía' || estatusSiguiente === 'en garantia';

    if (esGarantiaAnterior === esGarantiaSiguiente) {
        return itemActual.historialGarantias || [];
    }

    let historial = Array.isArray(itemActual.historialGarantias) ? [...itemActual.historialGarantias] : [];

    let fecha = new Date().toISOString().split('T')[0];
    if (fechaMovimiento) {
        if (typeof fechaMovimiento === 'string') {
            if (/^\d{4}-\d{2}-\d{2}/.test(fechaMovimiento)) {
                fecha = fechaMovimiento.substring(0, 10);
            } else {
                fecha = fechaMovimiento;
            }
        } else if (fechaMovimiento instanceof Date) {
            fecha = fechaMovimiento.toISOString().split('T')[0];
        } else if (fechaMovimiento.toDate && typeof fechaMovimiento.toDate === 'function') {
            fecha = fechaMovimiento.toDate().toISOString().split('T')[0];
        } else if (fechaMovimiento.seconds) {
            fecha = new Date(fechaMovimiento.seconds * 1000).toISOString().split('T')[0];
        }
    }

    if (esGarantiaSiguiente) {
        historial.push({
            fechaEntrada: fecha,
            fechaSalida: null,
            motivo: motivo || "Cambio a garantía",
            comentarios: comentarios || ""
        });
    } else if (esGarantiaAnterior) {
        let actualizado = false;
        for (let i = historial.length - 1; i >= 0; i--) {
            if (!historial[i].fechaSalida) {
                historial[i] = {
                    ...historial[i],
                    fechaSalida: fecha,
                    comentariosSalida: comentarios || motivo || `Cambio de estatus a "${nuevoEstatus}"`
                };
                actualizado = true;
                break;
            }
        }
        if (!actualizado) {
            historial.push({
                fechaEntrada: itemActual.fechaMovimiento || fecha,
                fechaSalida: fecha,
                motivo: "Salida de garantía sin registro de entrada",
                comentariosSalida: comentarios || motivo || `Cambio de estatus a "${nuevoEstatus}"`
            });
        }
    }

    return historial;
};

window.eliminarSeleccionados = async () => {
    window.cerrarDropdownAcciones();
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) return;

    if (await confirmarAccion(
        "Eliminar Registros",
        `ALERTA CRÍTICA: ¿Estás seguro de eliminar permanentemente ${seleccionados.length} registros de la base de datos?\nEsta acción no se puede deshacer.`,
        "Sí, Eliminar",
        "No, Cancelar"
    )) {
        try {
            modalLoading.show();

            const batchSize = 490;
            for (let i = 0; i < seleccionados.length; i += batchSize) {
                const chunk = seleccionados.slice(i, i + batchSize);
                const currentBatch = writeBatch(db);

                chunk.forEach(serie => {
                    if (!serie || serie === 'undefined') return;
                    const docRef = doc(db, 'almacen', serie);
                    currentBatch.delete(docRef);

                    const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
                    if (index !== -1) {
                        window.inventarioGlobal.splice(index, 1);
                    }
                });

                await currentBatch.commit();
                await new Promise(r => setTimeout(r, 150));
            }

            window.seriesSeleccionadasGlobal.clear();
            window.seleccionGlobal = false;
            document.getElementById('chkSelectAll').checked = false;
            verificarSeleccion();

            await Swal.fire({
                title: "Eliminación Exitosa",
                text: `Se eliminaron ${seleccionados.length} equipos correctamente.`,
                icon: "success"
            });
            cargarInventario('inicio', false);
        } catch (error) {
            console.error("Error al eliminar multiples:", error);
            await Swal.fire({
                title: "Error",
                text: "No se pudo eliminar los registros seleccionados",
                icon: "error"
            });
        } finally {
            modalLoading.hide();
        }
    }
};

window.cambiarEstatusSeleccionados = async () => {
    window.cerrarDropdownAcciones();
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) return;

    const nuevoEstatusResult = await Swal.fire({
        title: 'Cambiar Estatus',
        text: `Vas a cambiar el estatus de ${seleccionados.length} equipos del contenedor.`,
        input: 'select',
        inputOptions: {
            'Almacén': 'Almacén',
            'Proceso': 'Proceso',
            'Por habilitar': 'Por Habilitar',
            'Vendido': 'Vendido',
            'En garantía': 'En Garantía',
            'Falta pza': 'Falta Pieza(s)',
        },
        inputPlaceholder: 'Selecciona un estatus',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Debes seleccionar un estatus';
            }
        }
    });

    const nuevoEstatus = nuevoEstatusResult.isConfirmed ? (nuevoEstatusResult.value || '') : null;

    if (!nuevoEstatus || nuevoEstatus.trim() === '') return;

    const estatusLower = nuevoEstatus.trim().toLowerCase();

    const normalizarEstatus = (est) => {
        const e = String(est || '').trim().toLowerCase();
        if (e === 'almacén' || e === 'almacen') return 'almacen';
        if (e === 'en garantía' || e === 'en garantia') return 'en garantia';
        return e;
    };

    const seleccionadosFiltrados = seleccionados.filter(serie => {
        const d = window.inventarioGlobal.find(item => item.serie === serie);
        if (!d) return true;
        return normalizarEstatus(d.estatus) !== normalizarEstatus(nuevoEstatus);
    });

    if (seleccionadosFiltrados.length === 0) {
        await Swal.fire({
            title: "Sin Cambios",
            text: "Todos los equipos seleccionados ya cuentan con el estatus indicado.",
            icon: "info"
        });
        return;
    }

    let equiposData = {};

    if (estatusLower === 'vendido' || estatusLower === 'proceso') {
        seleccionadosFiltrados.forEach(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                equiposData[serie] = d;
            }
        });
    }

    let clienteVenta = "";
    let fechaEntregaMasiva = "";
    let fechaPagoMasiva = "";
    let fechaMov = new Date();

    let mostrarPromptCliente = false;
    let mostrarPromptFechaEntrega = false;
    let mostrarPromptFechaPago = false;

    if (estatusLower === 'vendido' || estatusLower === 'proceso') {
        mostrarPromptCliente = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.cliente && String(d.cliente).trim() !== '' && String(d.cliente).trim().toLowerCase() !== 'sin asignar';
            return !tiene;
        });

        mostrarPromptFechaEntrega = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.fechaEntrega && String(d.fechaEntrega).trim() !== '';
            return !tiene;
        });
    }

    if (estatusLower === 'vendido') {
        mostrarPromptFechaPago = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.fechaPago && String(d.fechaPago).trim() !== '';
            return !tiene;
        });
    }

    if (mostrarPromptCliente) {
        const clienteVentaResult = await Swal.fire({
            title: "Ingresar Cliente",
            text: `Por favor, ingresa el cliente para estos equipos en ${nuevoEstatus.trim().toLowerCase()}:`,
            input: "text",
            inputPlaceholder: "Nombre del cliente",
            showCancelButton: true,
            confirmButtonText: (mostrarPromptFechaEntrega || mostrarPromptFechaPago) ? "Siguiente" : "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'El nombre del cliente es obligatorio';
                }
            }
        });
        if (clienteVentaResult.dismiss) return;
        clienteVenta = (clienteVentaResult.value || '').trim();
    }

    if (mostrarPromptFechaEntrega) {
        const fechaEntregaMasivaResult = await Swal.fire({
            title: "Fecha de Entrega",
            text: "Ingresa la fecha de entrega para estos equipos:",
            input: "date",
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: mostrarPromptFechaPago ? "Siguiente" : "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value) {
                    return 'La fecha de entrega es obligatoria';
                }
            }
        });
        if (fechaEntregaMasivaResult.dismiss) return;
        fechaEntregaMasiva = (fechaEntregaMasivaResult.value || '').trim();
    }

    if (mostrarPromptFechaPago) {
        const fechaPagoMasivaResult = await Swal.fire({
            title: "Fecha de Pago",
            text: "Ingresa la fecha de pago para estos equipos vendidos:",
            input: "date",
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value) {
                    return 'La fecha de pago es obligatoria';
                }
            }
        });
        if (fechaPagoMasivaResult.dismiss) return;
        fechaPagoMasiva = (fechaPagoMasivaResult.value || '').trim();
    }

    let newComentario = '';
    let newEstetica = '';

    const destinoValido = ['en garantía', 'en garantia', 'falta pza', 'almacén', 'almacen'];

    const requiereMotivo = destinoValido.includes(estatusLower);
    const esGarantiaOPieza = ['en garantía', 'en garantia', 'falta pza', 'almacén', 'almacen'].includes(estatusLower);

    let algunSinComentarios = false;
    let algunSinEstetica = false;

    if (requiereMotivo) {
        seleccionadosFiltrados.forEach(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                const tieneComentarios = d.comentarios && String(d.comentarios).trim() !== '';
                const tieneEstetica = d.estetica && String(d.estetica).trim() !== '';
                if (!tieneComentarios) algunSinComentarios = true;
                if (!tieneEstetica) algunSinEstetica = true;
            } else {
                algunSinComentarios = true;
                algunSinEstetica = true;
            }
        });

        if (esGarantiaOPieza || algunSinComentarios) {
            const comentarioResult = await Swal.fire({
                title: esGarantiaOPieza ? "Nuevos Comentarios Requeridos" : "Comentarios",
                text: esGarantiaOPieza
                    ? `Vas a mover ${seleccionadosFiltrados.length} equipos a "${nuevoEstatus.trim()}". Por favor, ingresa los nuevos comentarios (reemplazarán los anteriores):`
                    : "Por favor, ingresa un comentario:",
                input: "text",
                showCancelButton: true,
                confirmButtonText: "Aceptar",
                cancelButtonText: "Cancelar"
            });
            newComentario = comentarioResult.isConfirmed ? (comentarioResult.value || '') : null;
            if (newComentario === null || newComentario.trim() === '') {
                await Swal.fire({
                    title: "Acción Cancelada",
                    text: "Es obligatorio ingresar un comentario.",
                    icon: "warning"
                });
                return;
            }
        }

        if (algunSinEstetica) {
            const esteticaResult = await Swal.fire({
                title: "Estética",
                text: "Por favor, ingresa un valor para la estética:",
                input: "text",
                showCancelButton: true,
                confirmButtonText: "Aceptar",
                cancelButtonText: "Cancelar"
            });
            newEstetica = esteticaResult.isConfirmed ? (esteticaResult.value || '') : null;
            if (newEstetica === null || newEstetica.trim() === '') {
                await Swal.fire({
                    title: "Acción Cancelada",
                    text: "Es obligatorio ingresar un valor para la estética.",
                    icon: "warning"
                });
                return;
            }
        }
    }

    let mostrarPromptTipoPrecio = false;
    if (estatusLower === 'proceso' || estatusLower === 'vendido') {
        mostrarPromptTipoPrecio = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.tipoPrecioAbono && String(d.tipoPrecioAbono).trim() !== '';
            return !tiene;
        });
    }

    let tipoPrecio = null;
    if (mostrarPromptTipoPrecio) {
        const tipoPrecioResult = await Swal.fire({
            title: "Tipo de Precio / Cliente",
            text: "¿Qué tipo de precio/cliente aplica para estos productos?",
            input: "select",
            inputOptions: {
                "publico": "Precio Público",
                "mayorista": "Precio Mayorista"
            },
            inputPlaceholder: "Selecciona el tipo de precio",
            showCancelButton: true,
            confirmButtonText: "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value) {
                    return "Debes seleccionar un tipo de precio";
                }
            }
        });

        tipoPrecio = tipoPrecioResult.isConfirmed ? tipoPrecioResult.value : null;
        if (!tipoPrecio) return;
    }

    try {
        modalLoading.show();

        const batchSize = 490;
        for (let i = 0; i < seleccionadosFiltrados.length; i += batchSize) {
            const chunk = seleccionadosFiltrados.slice(i, i + batchSize);
            const currentBatch = writeBatch(db);

            chunk.forEach(serie => {
                if (!serie || serie === 'undefined') return;

                const docRef = doc(db, 'almacen', serie);
                const itemActual = window.inventarioGlobal.find(item => item.serie === serie) || {};
                const idsActualizar = itemActual.productoIds || (itemActual.productoId ? [itemActual.productoId] : []);
                if (idsActualizar.length > 0) {
                    const estPrevio = normalizarEstatus(itemActual.estatus);
                    const estNuevo = normalizarEstatus(nuevoEstatus);
                    const eraAlmacen = (estPrevio === 'almacen');
                    const esAlmacen = (estNuevo === 'almacen');

                    let delta = 0;
                    if (!eraAlmacen && esAlmacen) delta = 1;
                    else if (eraAlmacen && !esAlmacen) delta = -1;

                    if (delta !== 0) {
                        idsActualizar.forEach(id => {
                            const prodRef = doc(db, 'productos', id);
                            currentBatch.update(prodRef, { stock: increment(delta) });
                        });
                    }
                }

                const tieneComentarios = itemActual.comentarios && String(itemActual.comentarios).trim() !== '';
                const comentariosFinal = esGarantiaOPieza ? newComentario : (tieneComentarios ? itemActual.comentarios : (newComentario || ''));

                const tieneEstetica = itemActual.estetica && String(itemActual.estetica).trim() !== '';
                const esteticaFinal = tieneEstetica ? itemActual.estetica : (newEstetica || '');

                const dataActualizacion = {
                    estatus: nuevoEstatus.trim(),
                    fechaMovimiento: fechaMov,
                    ultimoMovimiento: "Cambio de estatus masivo"
                };
                if (requiereMotivo) {
                    dataActualizacion.comentarios = comentariosFinal;
                    dataActualizacion.estetica = esteticaFinal;
                }
                if (estatusLower === 'proceso' || estatusLower === 'vendido') {
                    const itemTieneTipoPrecio = itemActual.tipoPrecioAbono && String(itemActual.tipoPrecioAbono).trim() !== '';
                    dataActualizacion.tipoPrecioAbono = itemTieneTipoPrecio ? String(itemActual.tipoPrecioAbono).trim() : (tipoPrecio || '').trim();
                    dataActualizacion.tipoCliente = itemTieneTipoPrecio ? String(itemActual.tipoPrecioAbono).trim() : (tipoPrecio || '').trim();
                }

                const nuevoHistorial = window.procesarTransicionGarantia(itemActual, nuevoEstatus.trim(), fechaMov, "Cambio de estatus masivo", comentariosFinal);
                if (nuevoHistorial) {
                    dataActualizacion.historialGarantias = nuevoHistorial;
                }

                if (estatusLower === 'vendido' || estatusLower === 'proceso') {
                    const itemTieneCliente = itemActual.cliente && String(itemActual.cliente).trim() !== '' && String(itemActual.cliente).trim().toLowerCase() !== 'sin asignar';
                    dataActualizacion.cliente = itemTieneCliente ? String(itemActual.cliente).trim() : (clienteVenta || '').trim();

                    const itemTieneFechaEntrega = itemActual.fechaEntrega && String(itemActual.fechaEntrega).trim() !== '';
                    dataActualizacion.fechaEntrega = itemTieneFechaEntrega ? String(itemActual.fechaEntrega).trim() : (fechaEntregaMasiva || '').trim();
                }

                if (estatusLower === 'vendido') {
                    const itemTieneFechaPago = itemActual.fechaPago && String(itemActual.fechaPago).trim() !== '';
                    dataActualizacion.fechaPago = itemTieneFechaPago ? String(itemActual.fechaPago).trim() : (fechaPagoMasiva || '').trim();
                }

                if (estatusLower === 'almacén' || estatusLower === 'almacen') {
                    dataActualizacion.cliente = "";
                    dataActualizacion.fechaPago = "";
                    dataActualizacion.fechaEntrega = "";
                    dataActualizacion.historialAbonos = [];
                }

                currentBatch.update(docRef, dataActualizacion);

                const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
                if (index !== -1) {
                    window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...dataActualizacion };
                }
            });

            await currentBatch.commit();
            await new Promise(r => setTimeout(r, 150));
        }

        window.seriesSeleccionadasGlobal.clear();
        window.seleccionGlobal = false;
        document.getElementById('chkSelectAll').checked = false;
        verificarSeleccion();

        await Swal.fire({
            title: "Actualización Completada",
            text: `Estatus actualizado a "${nuevoEstatus}" para ${seleccionadosFiltrados.length} equipos.`,
            icon: "success"
        });
        cargarInventario('inicio', false);
    } catch (error) {
        console.error("Error al actualizar estatus masivo:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al intentar cambiar el estatus masivamente.",
            icon: "error"
        });
    } finally {
        modalLoading.hide();
    }
};

window.abrirModalEditarFechasSeleccionados = async () => {
    window.cerrarDropdownAcciones();
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) {
        await Swal.fire({
            title: "Selección Requerida",
            text: "Por favor, selecciona al menos un equipo.",
            icon: "warning"
        });
        return;
    }

    const lbl = document.getElementById('lblCantSeleccionadosFechas');
    if (lbl) lbl.innerText = seleccionados.length;

    const chkEntrega = document.getElementById('chkActualizarFechaEntrega');
    const chkPago = document.getElementById('chkActualizarFechaPago');
    const inputEntrega = document.getElementById('editFechaEntregaMasiva');
    const inputPago = document.getElementById('editFechaPagoMasiva');

    if (chkEntrega) chkEntrega.checked = false;
    if (chkPago) chkPago.checked = false;
    if (inputEntrega) {
        inputEntrega.value = '';
        inputEntrega.disabled = true;
    }
    if (inputPago) {
        inputPago.value = '';
        inputPago.disabled = true;
    }

    const modal = new bootstrap.Modal(document.getElementById('modalEditarFechasMasivo'));
    modal.show();
};

window.ordenFechaActivo = false;
window.ordenFechaDir = 'desc';
window.toggleOrdenFecha = () => {
    window.ordenFechaDir = window.ordenFechaDir === 'asc' ? 'desc' : 'asc';
    window.ordenFechaActivo = true;
    window.ordenClienteAlfabActivo = false;
    window.ordenCategoriaActivo = false;
    cargarInventario('inicio', false);
};

window.ordenClienteAlfabActivo = false;
window.ordenClienteAlfabDir = 'asc';
window.toggleOrdenClienteAlfab = () => {
    window.ordenClienteAlfabDir = window.ordenClienteAlfabDir === 'asc' ? 'desc' : 'asc';
    window.ordenClienteAlfabActivo = true;
    window.ordenFechaActivo = false;
    window.ordenCategoriaActivo = false;
    cargarInventario('inicio', false);
};

window.ordenCategoriaActivo = false;
window.ordenCategoriaDir = 'asc';
window.toggleOrdenCategoria = () => {
    window.ordenCategoriaDir = window.ordenCategoriaDir === 'asc' ? 'desc' : 'asc';
    window.ordenCategoriaActivo = true;
    window.ordenClienteAlfabActivo = false;
    window.ordenFechaActivo = false;
    cargarInventario('inicio', false);
};

window.inventarioGlobal = [];
window.datosDescargados = false;

async function cargarInventario(direccion = 'inicio', forzarActualizacion = false) {
    try {
        const mostrarLoading = (!window.datosDescargados || forzarActualizacion);

        if (mostrarLoading) {
            modalLoading.show();
        }

        const estatusFiltroActual = document.getElementById('filtroEstatus') ? document.getElementById('filtroEstatus').value.trim().toLowerCase() : "";
        const tieneSeriesEscaneadas = window.seriesEscaneadas && window.seriesEscaneadas.size > 0;
        const busqueda = document.getElementById('buscadorGeneral') ? document.getElementById('buscadorGeneral').value.trim().toLowerCase() : "";

        const condicionFiltroActual = document.getElementById('filtroCondicion').value.trim().toLowerCase();
        const allCards = document.querySelectorAll('.kpi-card-container');

        allCards.forEach(card => {
            let isActive = false;
            const cardEstatus = card.getAttribute('data-estatus');
            const cardCondicion = card.getAttribute('data-condicion');

            if (cardEstatus === "") {
                if (estatusFiltroActual === "" && condicionFiltroActual === "") {
                    isActive = true;
                }
            } else if (cardEstatus && cardEstatus.trim().toLowerCase() === estatusFiltroActual) {
                isActive = true;
            } else if (cardCondicion && cardCondicion.trim().toLowerCase() === condicionFiltroActual) {
                isActive = true;
            }

            if (isActive) {
                card.classList.add('card-active');
            } else {
                card.classList.remove('card-active');
            }
        });

        const cuerpoTabla = document.getElementById('cuerpoTabla');
        const categoriaFiltro = document.getElementById('filtroCategoria').value.trim().toLowerCase();
        const estatusFiltro = document.getElementById('filtroEstatus').value.trim().toLowerCase();
        const condicionFiltro = document.getElementById('filtroCondicion').value.trim().toLowerCase();

        if (window.seriesEscaneadas && !busqueda.startsWith('[escaneados:')) {
            window.seriesEscaneadas.clear();
        }
        const fechaInicio = document.getElementById('filtroFechaInicio') ? document.getElementById('filtroFechaInicio').value : '';
        const fechaFin = document.getElementById('filtroFechaFin') ? document.getElementById('filtroFechaFin').value : '';

        if (!window.datosDescargados || forzarActualizacion) {
            let q = collection(db, "almacen");
            const snapshot = await getDocs(q);

            window.inventarioGlobal = [];
            snapshot.forEach((doc) => {
                window.inventarioGlobal.push(doc.data());
            });
            window.datosDescargados = true;
        }

        actualizarEstadisticas();
        calcularTotalValorPorEstatus();
        calcularTotalValorPorCondicion();

        let resultadosFiltrados = [];

        window.inventarioGlobal.forEach((data) => {
            const catDoc = String(data.categoria || '').trim().toLowerCase();
            const estDoc = String(data.estatus || '').trim().toLowerCase();
            const condDoc = String(data.condicion || '').trim().toLowerCase();

            let pasaFiltros = true;

            if (categoriaFiltro !== '' && catDoc !== categoriaFiltro) pasaFiltros = false;

            if (estatusFiltro !== '') {
                if (estatusFiltro === 'almacén' || estatusFiltro === 'almacen') {
                    if (estDoc !== 'almacén' && estDoc !== 'almacen') pasaFiltros = false;
                } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                    if (estDoc !== 'en garantía' && estDoc !== 'en garantia') pasaFiltros = false;
                } else {
                    if (estDoc !== estatusFiltro) pasaFiltros = false;
                }
            }

            if (condicionFiltro !== '' && condDoc !== condicionFiltro) pasaFiltros = false;

            if (pasaFiltros && window.seriesEscaneadas && window.seriesEscaneadas.size > 0) {
                const serie = String(data.serie || '').trim().toLowerCase();
                if (!window.seriesEscaneadas.has(serie)) {
                    pasaFiltros = false;
                }
            } else if (pasaFiltros && busqueda !== '') {
                const terminos = busqueda.split(' ').filter(t => t.trim() !== '');
                const serie = String(data.serie || '').toLowerCase();
                const marcaModelo = (String(data.marca || '') + ' ' + String(data.modelo || '') + ' ' + String(data.procesador || '') + ' ' + String(data.ram || '').replace(/\s+/g, '')).toLowerCase();
                const cliente = String(data.cliente || '').toLowerCase();
                const lote = String(data.nLot || '').toLowerCase();

                const cumpleBusqueda = terminos.every(termino =>
                    serie.includes(termino) ||
                    marcaModelo.includes(termino) ||
                    cliente.includes(termino)
                );

                if (!cumpleBusqueda) {
                    pasaFiltros = false;
                }
            }

            if (pasaFiltros && (fechaInicio !== '' || fechaFin !== '')) {
                let fEntrega = (data.fechaEntrega && data.fechaEntrega.trim() !== '') ? new Date(data.fechaEntrega + "T00:00:00").toLocaleDateString('es-MX') : '';
                let fPago = (data.fechaPago && data.fechaPago.trim() !== '') ? new Date(data.fechaPago + "T00:00:00").toLocaleDateString('es-MX') : '';
                let fMovimiento = '';

                if (data.fechaMovimiento) {
                    fMovimiento = data.fechaMovimiento.toDate ? data.fechaMovimiento.toDate().toISOString().split('T')[0] : '';
                }

                const checkRango = (fecha) => {
                    if (!fecha || fecha.trim() === '') return false;
                    let f = fecha.trim().substring(0, 10);

                    if (f.includes('/')) {
                        const p = f.split('/');
                        if (p.length === 3) {
                            if (p[2].length === 4) f = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                            else if (p[0].length === 4) f = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
                        }
                    }

                    if (fechaInicio !== '' && f < fechaInicio) return false;
                    if (fechaFin !== '' && f > fechaFin) return false;
                    return true;
                };

                if (!checkRango(fEntrega) && !checkRango(fPago) && !checkRango(fMovimiento)) {
                    pasaFiltros = false;
                }
            }

            if (pasaFiltros) {
                resultadosFiltrados.push(data);
            }
        });

        resultadosFiltrados.sort((a, b) => {
            if (window.ordenCategoriaActivo) {
                let valA = String(a.categoria || '').trim().toLowerCase();
                let valB = String(b.categoria || '').trim().toLowerCase();
                if (valA < valB) return window.ordenCategoriaDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenCategoriaDir === 'asc' ? 1 : -1;
                return 0;
            }

            if (window.ordenClienteAlfabActivo) {
                let valA = String(a.cliente || '').trim().toLowerCase();
                let valB = String(b.cliente || '').trim().toLowerCase();
                if (valA < valB) return window.ordenClienteAlfabDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenClienteAlfabDir === 'asc' ? 1 : -1;
                return 0;
            }

            if (window.ordenFechaActivo) {
                const parseDateStr = (d) => {
                    let f = d.fechaEntrega || d.fechaPago || '';
                    if (!f && d.fechaMovimiento && d.fechaMovimiento.toDate) {
                        f = d.fechaMovimiento.toDate().toISOString().split('T')[0];
                    }
                    if (!f) return 0;
                    let val = String(f).trim();
                    if (val.includes('-')) return Number(val.replace(/-/g, ''));
                    if (val.includes('/')) {
                        const p = val.split('/');
                        if (p.length === 3) {
                            if (p[2].length === 4) return Number(`${p[2]}${p[1].padStart(2, '0')}${p[0].padStart(2, '0')}`);
                            if (p[0].length === 4) return Number(`${p[0]}${p[1].padStart(2, '0')}${p[2].padStart(2, '0')}`);
                        }
                    }
                    return 0;
                };
                let valA = parseDateStr(a);
                let valB = parseDateStr(b);
                if (valA < valB) return window.ordenFechaDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenFechaDir === 'asc' ? 1 : -1;
                return 0;
            }

            let valA = a[campoOrden] || '';
            let valB = b[campoOrden] || '';

            if (campoOrden === 'fechaEntrega') {
                const parseDate = (d) => {
                    if (!d) return 0;
                    if (d.includes('-')) return Number(d.replace(/-/g, ''));
                    if (d.includes('/')) {
                        const p = d.split('/');
                        if (p.length === 3) return Number(`${p[2]}${p[1].padStart(2, '0')}${p[0].padStart(2, '0')}`);
                    }
                    return 0;
                };
                valA = parseDate(valA);
                valB = parseDate(valB);
            }

            if (campoOrden === 'precioMayorista') {
                valA = Number(valA);
                valB = Number(valB);
            }

            if (valA < valB) return dirOrden === 'asc' ? -1 : 1;
            if (valA > valB) return dirOrden === 'asc' ? 1 : -1;
            return 0;
        });

        if (direccion === 'inicio') paginaActual = 1;

        const indiceInicio = (paginaActual - 1) * tamanoPagina;
        const indiceFin = indiceInicio + tamanoPagina;

        const resultadosRender = resultadosFiltrados.slice(indiceInicio, indiceFin);

        document.getElementById('numPagina').innerHTML = paginaActual;
        document.getElementById('btnInicio').disabled = (paginaActual === 1);
        document.getElementById('btnAnterior').disabled = (paginaActual === 1);
        document.getElementById('btnSiguiente').disabled = (indiceFin >= resultadosFiltrados.length);

        const numMostradosSpan = document.getElementById('numMostrados');
        const numTotalMostradosSpan = document.getElementById('numTotalMostrados');
        const totalFiltradosSpan = document.getElementById('totalFiltrados');
        if (numMostradosSpan) numMostradosSpan.innerText = resultadosFiltrados.length === 0 ? 0 : indiceInicio;
        if (numTotalMostradosSpan) numTotalMostradosSpan.innerText = indiceInicio + resultadosRender.length;
        if (totalFiltradosSpan) totalFiltradosSpan.innerText = resultadosFiltrados.length;

        cuerpoTabla.innerHTML = '';

        const cabeceraTabla = document.getElementById('cabeceraTabla');
        if (cabeceraTabla) {
            const iconoOrden = (!window.ordenFechaActivo) ? 'bi-arrow-down-up text-secondary' : (window.ordenFechaDir === 'asc' ? 'bi-sort-numeric-up' : 'bi-sort-numeric-down');
            const iconoOrdenCliente = (!window.ordenClienteAlfabActivo) ? 'bi-arrow-down-up text-secondary' : (window.ordenClienteAlfabDir === 'asc' ? 'bi-sort-alpha-up' : 'bi-sort-alpha-down');
            const iconoOrdenCategoria = (!window.ordenCategoriaActivo) ? 'bi-arrow-down-up text-secondary' : (window.ordenCategoriaDir === 'asc' ? 'bi-sort-alpha-up' : 'bi-sort-alpha-down');
            if (estatusFiltro === 'proceso' || estatusFiltro === 'vendido') {
                cabeceraTabla.innerHTML = `
                    <th style="width: 40px;"><input type="checkbox" class="form-check-input" id="chkSelectAll" onclick="toggleSelectAll(this)"></th>
                    <th style="min-width: 140px;">Serie</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenCategoria()" title="Clic para ordenar por categoría">Categoría <i class="bi ${iconoOrdenCategoria} ms-1"></i></th>
                    <th>Marca & Modelo</th>
                    <th>CPU & RAM</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenClienteAlfab()" title="Clic para ordenar por cliente">Cliente<i class="bi ${iconoOrdenCliente} ms-1"></i></th>
                    <th class="text-center" style="cursor: pointer; user-select: none; white-space: nowrap;">Precio Est.</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenFecha()" title="Clic para ordenar por fecha">Fechas <i class="bi ${iconoOrden} ms-1"></i></th>
                    <th class="text-center">Condicion</th>
                    <th class="text-center">Estatus</th>
                    <th class="text-center">Acciones</th>
                `;
            } else if (estatusFiltro === 'almacen' || estatusFiltro === 'almacén' || estatusFiltro === 'falta pza' || estatusFiltro === 'por habilitar') {
                cabeceraTabla.innerHTML = `
                    <th style="width: 40px;"><input type="checkbox" class="form-check-input" id="chkSelectAll" onclick="toggleSelectAll(this)"></th>
                    <th style="min-width: 140px;">Serie</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenCategoria()" title="Clic para ordenar por categoría">Categoría <i class="bi ${iconoOrdenCategoria} ms-1"></i></th>
                    <th>Marca & Modelo</th>
                    <th>CPU & RAM</th>
                    <th class="text-center">Precios</th>
                    <th class="text-center">Condicion</th>
                    <th class="text-center">Estatus</th>
                    <th class="text-center">Acciones</th>
                `;
            } else {
                cabeceraTabla.innerHTML = `
                    <th style="width: 40px;"><input type="checkbox" class="form-check-input" id="chkSelectAll" onclick="toggleSelectAll(this)"></th>
                    <th style="min-width: 140px;">Serie</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenCategoria()" title="Clic para ordenar por categoría">Categoría <i class="bi ${iconoOrdenCategoria} ms-1"></i></th>
                    <th>Marca & Modelo</th>
                    <th>CPU & RAM</th>
                    <th style="cursor: pointer; user-select: none; white-space: nowrap;" onclick="toggleOrdenClienteAlfab()" title="Clic para ordenar por cliente">Cliente <i class="bi ${iconoOrdenCliente} ms-1"></i></th>
                    <th class="text-center" style="cursor: pointer; user-select: none; white-space: nowrap;">Precio</th>
                    <th class="text-center">Condicion</th>
                    <th class="text-center">Estatus</th>
                    <th class="text-center">Acciones</th>
                `;
            }
        }

        if (resultadosRender.length === 0) {
            const numCols = (estatusFiltro === 'vendido' || estatusFiltro === 'proceso') ? 11 : ((estatusFiltro === 'almacen' || estatusFiltro === 'almacén' || estatusFiltro === 'falta pza' || estatusFiltro === 'por habilitar') ? 9 : 10);
            cuerpoTabla.innerHTML = `
                <tr>
                    <td colspan="${numCols}">
                        <div class="d-flex flex-column align-items-center justify-content-center py-5 text-muted">
                            <i class="bi bi-search" style="font-size: 3.5rem; color: #dee2e6;"></i>
                            <h5 class="mt-3 fw-bold text-dark">No se encontraron equipos</h5>
                            <p class="small">Intenta ajustar los filtros de búsqueda o limpia las condiciones actuales.</p>
                            <button class="btn btn-outline-secondary btn-sm mt-2 rounded-pill px-4" onclick="document.getElementById('btnLimpiarFiltros').click()">Limpiar Filtros</button>
                        </div>
                    </td>
                </tr>`;
            modalLoading.hide();
            return;
        }

        const chkSelectAll = document.getElementById('chkSelectAll');
        if (chkSelectAll) chkSelectAll.checked = false;
        verificarSeleccion();

        resultadosRender.forEach((data) => {
            let badgeCondicion = 'bg-light text-secondary border';
            const condMin = String(data.condicion || '').toLowerCase();
            if (condMin === 'nuevo') badgeCondicion = 'bg-primary-subtle text-primary border border-primary-subtle';
            if (condMin === 'refurbished') badgeCondicion = 'bg-danger-subtle text-danger border border-danger-subtle';
            if (condMin === 'usado') badgeCondicion = 'bg-dark-subtle text-dark border border-dark-subtle';

            let badgeEstatus = 'bg-primary';
            const estMin = String(data.estatus || '').toLowerCase();
            if (estMin === 'vendido') badgeEstatus = 'bg-primary';
            if (estMin === 'proceso') badgeEstatus = 'bg-proceso';
            if (estMin === 'en garantía' || estMin === 'en garantia') badgeEstatus = 'bg-garantia';
            if (estMin === 'por habilitar') badgeEstatus = 'bg-habilitar text-white';
            if (estMin === 'falta pza') badgeEstatus = 'bg-danger';
            if (estMin === 'almacén' || estMin === 'almacen') badgeEstatus = 'bg-success';

            const isChecked = window.seriesSeleccionadasGlobal.has(data.serie) ? 'checked' : '';
            const rowStyle = isChecked ? 'background-color: #ddf3ff; --bs-table-bg: #ddf3ff; color: black; cursor: default;' : 'cursor: default;';

            let fechasTd = '';
            if (estatusFiltro === 'vendido' || estatusFiltro === 'proceso') {
                const getFecha = (f) => {
                    if (!f) return 'N/A';
                    let res = formatearFechaEstricta(f);
                    return (res === 'Fecha no disponible' || res === 'Formato desconocido' || res === 'Error en fecha') ? 'N/A' : res;
                };

                let fechaPagoMostrar = data.fechaPago;
                let etiquetaPago = 'Pag:';

                if (estatusFiltro === 'proceso') {
                    etiquetaPago = 'Abo:';
                    const historial = data.historialAbonos || [];
                    if (historial.length > 0) {
                        const ultimoAbono = historial[historial.length - 1];
                        if (ultimoAbono.fecha) {
                            fechaPagoMostrar = ultimoAbono.fecha;
                        }
                    }
                }

                fechasTd = `<td>
                                <div style="font-size: 0.85em; white-space: nowrap;">
                                    <span class="text-muted fw-bold">Ent:</span> ${getFecha(data.fechaEntrega)}<br>
                                    <span class="text-muted fw-bold">${etiquetaPago}</span> ${getFecha(fechaPagoMostrar)}
                                </div>
                            </td>`;
            }

            const tipoPrecio = data.tipoPrecioAbono || 'publico';
            let badgeTipoPrecio = '';
            let precioEstablecidoMonto = 0;
            if (tipoPrecio === 'mayorista') {
                badgeTipoPrecio = `<span class="badge border bg-light text-secondary me-1" style="font-size: 0.75em;">Mayorista</span>`;
                precioEstablecidoMonto = Number(data.precioMayorista || 0);
            } else {
                badgeTipoPrecio = `<span class="badge bg-success-subtle text-success me-1" style="font-size: 0.75em;">U. Final</span>`;
                precioEstablecidoMonto = Number(data.precioPublico || 0);
            }

            let customPrecioHTML = '';
            if (estMin === 'proceso' || estMin === 'en garantía' || estMin === 'en garantia') {
                const historial = data.historialAbonos || [];
                const totalAbonado = historial.reduce((sum, item) => sum + Number(item.monto), 0);
                customPrecioHTML = `<div class="text-end fw-medium">
                    <div>${badgeTipoPrecio}$${precioEstablecidoMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div class="mt-1 text-muted" style="font-size: 0.8em;">
                        <span class="badge border bg-success-subtle text-success me-1" style="font-size: 0.75em;">Abonado</span>$${Number(totalAbonado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </div>
                </div>`;
            } else if (estMin === 'vendido') {
                customPrecioHTML = `<div class="text-end fw-medium">
                    <div>${badgeTipoPrecio}$${precioEstablecidoMonto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                </div>`;
            } else {
                customPrecioHTML = `<div class="text-center fw-medium">
                    <span class="text-truncate text-muted d-block" style="font-size: 0.85em;" title="Precio Público">
                        <span class="badge bg-success-subtle text-success me-1" style="font-size: 0.75em;">P. Púb</span>$${Number(data.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                    <span class="text-truncate text-muted d-block mt-1" style="font-size: 0.85em;" title="Precio Mayorista">
                        <span class="badge border bg-light text-secondary me-1" style="font-size: 0.75em;">P. May</span>$${Number(data.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                </div>`;
            }

            const clienteTdHTML = `<td>
                <span class="text-truncate d-block" style="max-width: 140px;" title="${data.cliente || 'Sin asignar'}">
                    <i class="bi bi-person me-1 text-muted"></i>${data.cliente || 'Sin asignar'}
                </span>
            </td>`;

            if (data.estatus === 'Proceso' || data.estatus === 'En garantía') {
                cuerpoTabla.innerHTML += `
                    <tr class="align-middle" style="${rowStyle}">
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input check-registro shadow-sm" value="${data.serie}" onchange="actualizarSeleccionIndividual(this)" ${isChecked}>
                        </td>
                        <td><span class="font-monospace fw-medium text-dark" style="font-size: 0.9em;">${data.serie || 'N/A'}</span></td>
                        <td><span class="badge bg-light text-dark border">${data.categoria || 'N/A'}</span></td>
                        <td><strong class="text-dark">${data.marca || 'N/A'}</strong> <span class="text-muted">${data.modelo || 'N/A'}</span></td>
                        <td style="font-size: 0.85em;">
                            <div class="text-truncate" style="max-width: 150px;" title="${data.procesador || 'N/A'} ${data.generacion || 'N/A'}">
                                <i class="bi bi-cpu text-muted me-1"></i>${data.procesador || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="bi bi-memory text-muted me-1"></i>${data.ram || 'N/A'} ${data.tipoRam || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="fa-regular fa-hard-drive text-muted me-1"></i>${data.ssd || data.hdd}
                            </div>
                        </td>
                        ${clienteTdHTML}
                        <td>
                            ${customPrecioHTML}
                        </td>
                        ${fechasTd}
                        <td><span class="badge w-100 ${badgeCondicion} rounded-pill">${data.condicion || 'N/A'}</span></td>
                        <td>
                            <div class="dropdown">
                                <button class="btn btn-sm w-100 dropdown-toggle badge ${badgeEstatus} border-0 rounded-pill shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.85em; padding: 6px 10px;">
                                    ${data.estatus}
                                </button>
                                <ul class="dropdown-menu shadow-sm" style="font-size: 0.85em;">
                                    <li><h6 class="dropdown-header">Mover equipo a:</h6></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Almacén')">Almacén</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Proceso')">Proceso</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Por habilitar')">Por habilitar</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Falta pza')">Falta Pieza(s)</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'En garantía')">En garantía</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Vendido', '${data.fechaEntrega || ''}')">Vendido</a></li>
                                </ul>
                            </div>
                        </td>
                        <td class="text-center" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="verDetalles('${data.serie}')" title="Ver Ficha Técnica">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="abrirEdicion('${data.serie}')" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-success rounded-circle border" onclick="abrirAbonos('${data.serie}')" title="Abonos">
                                <i class="fa-solid fa-wallet"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else if ((data.estatus === 'Almacen' || data.estatus === 'Almacén') || (data.estatus === 'Por habilitar' || data.estatus === 'por habilitar')) {
                cuerpoTabla.innerHTML += `
                    <tr class="align-middle" style="${rowStyle}">
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input check-registro shadow-sm" value="${data.serie}" onchange="actualizarSeleccionIndividual(this)" ${isChecked}>
                        </td>
                        <td><span class="font-monospace fw-medium text-dark" style="font-size: 0.9em;">${data.serie || 'N/A'}</span></td>
                        <td><span class="badge bg-light text-dark border">${data.categoria || 'N/A'}</span></td>
                        <td><strong class="text-dark">${data.marca || 'N/A'}</strong> <span class="text-muted">${data.modelo || 'N/A'}</span></td>
                        <td style="font-size: 0.85em;">
                            <div class="text-truncate" style="max-width: 150px;" title="${data.procesador || 'N/A'} ${data.generacion || 'N/A'}">
                                <i class="bi bi-cpu text-muted me-1"></i>${data.procesador || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="bi bi-memory text-muted me-1"></i>${data.ram || 'N/A'} ${data.tipoRam || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="fa-regular fa-hard-drive text-muted me-1"></i>${data.ssd || data.hdd}
                            </div>
                        </td>
                        ${(estatusFiltro === 'almacen' || estatusFiltro === 'almacén' || estatusFiltro === 'falta pza' || estatusFiltro === 'por habilitar') ? '' : `<td><span class="text-muted small">Sin cliente</span></td>`}
                        <td>
                            ${customPrecioHTML}
                        </td>
                        <td><span class="badge w-100 ${badgeCondicion} rounded-pill">${data.condicion || 'N/A'}</span></td>
                        <td>
                            <div class="dropdown">
                                <button class="btn btn-sm w-100 dropdown-toggle badge ${badgeEstatus} border-0 rounded-pill shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.85em; padding: 6px 10px;">
                                    ${data.estatus}
                                </button>
                                <ul class="dropdown-menu shadow-sm" style="font-size: 0.85em;">
                                    <li><h6 class="dropdown-header">Mover equipo a:</h6></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Almacén')">Almacén</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Proceso')">Proceso</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Por habilitar')">Por habilitar</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Falta pza')">Falta Pieza(s)</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'En garantía')">En garantía</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Vendido', '${data.fechaEntrega || ''}')">Vendido</a></li>
                                </ul>
                            </div>
                        </td>
                        <td class="text-center" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="verDetalles('${data.serie}')" title="Ver Ficha Técnica">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="abrirEdicion('${data.serie}')" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-success rounded-circle border" title="Abonos" disabled>
                                <i class="fa-solid fa-wallet"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else if (data.estatus === 'Falta pza' || data.estatus === 'Falta Pza') {
                cuerpoTabla.innerHTML += `
                    <tr class="align-middle" style="${rowStyle}">
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input check-registro shadow-sm" value="${data.serie}" onchange="actualizarSeleccionIndividual(this)" ${isChecked}>
                        </td>
                        <td><span class="font-monospace fw-medium text-dark" style="font-size: 0.9em;">${data.serie || 'N/A'}</span></td>
                        <td><span class="badge bg-light text-dark border">${data.categoria || 'N/A'}</span></td>
                        <td><strong class="text-dark">${data.marca || 'N/A'}</strong> <span class="text-muted">${data.modelo || 'N/A'}</span></td>
                        <td style="font-size: 0.85em;">
                            <div class="text-truncate" style="max-width: 150px;" title="${data.procesador || 'N/A'} ${data.generacion || 'N/A'}">
                                <i class="bi bi-cpu text-muted me-1"></i>${data.procesador || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="bi bi-memory text-muted me-1"></i>${data.ram || 'N/A'} ${data.tipoRam || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="fa-regular fa-hard-drive text-muted me-1"></i>${data.ssd || data.hdd}
                            </div>
                        </td>
                        ${(estatusFiltro === 'almacen' || estatusFiltro === 'almacén' || estatusFiltro === 'falta pza' || estatusFiltro === 'por habilitar') ? '' : `<td><span class="text-muted small">Sin cliente</span></td>`}
                        <td>
                            ${customPrecioHTML}
                        </td>
                        <td><span class="badge w-100 ${badgeCondicion} rounded-pill">${data.condicion || 'N/A'}</span></td>
                        <td>
                            <div class="dropdown">
                                <button class="btn btn-sm w-100 dropdown-toggle badge ${badgeEstatus} border-0 rounded-pill shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.85em; padding: 6px 10px;">
                                    ${data.estatus}
                                </button>
                                <ul class="dropdown-menu shadow-sm" style="font-size: 0.85em;">
                                    <li><h6 class="dropdown-header">Mover equipo a:</h6></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Almacén')">Almacén</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Proceso')">Proceso</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Por habilitar')">Por habilitar</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Falta pza')">Falta Pieza(s)</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'En garantía')">En garantía</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Vendido', '${data.fechaEntrega || ''}')">Vendido</a></li>
                                </ul>
                            </div>
                        </td>
                        <td class="text-center" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="verDetalles('${data.serie}')" title="Ver Ficha Técnica">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="abrirEdicion('${data.serie}')" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-success rounded-circle border" title="Abonos" disabled>
                                <i class="fa-solid fa-wallet"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                cuerpoTabla.innerHTML += `
                    <tr class="align-middle" style="${rowStyle}">
                        <td class="text-center">
                            <input type="checkbox" class="form-check-input check-registro shadow-sm" value="${data.serie}" onchange="actualizarSeleccionIndividual(this)" ${isChecked}>
                        </td>
                        <td><span class="font-monospace fw-medium text-dark" style="font-size: 0.9em;">${data.serie || 'N/A'}</span></td>
                        <td><span class="badge bg-light text-dark border">${data.categoria || 'N/A'}</span></td>
                        <td><strong class="text-dark">${data.marca || 'N/A'}</strong> <span class="text-muted" style="max-width: 140px">${data.modelo || 'N/A'}</span></td>
                        <td style="font-size: 0.85em;">
                            <div class="text-truncate" style="max-width: 150px;" title="${data.procesador || 'N/A'} ${data.generacion || 'N/A'}">
                                <i class="bi bi-cpu text-muted me-1"></i>${data.procesador || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="bi bi-memory text-muted me-1"></i>${data.ram || 'N/A'} ${data.tipoRam || 'N/A'}
                            </div>
                            <div class="text-truncate mt-1" style="max-width: 150px;">
                                <i class="fa-regular fa-hard-drive text-muted me-1"></i>${data.ssd || data.hdd}
                            </div>
                        </td>
                        ${clienteTdHTML}
                        <td>
                            ${customPrecioHTML}
                        </td>
                        ${fechasTd}
                        <td><span class="badge w-100 ${badgeCondicion} rounded-pill">${data.condicion || 'N/A'}</span></td>
                        <td>
                            <div class="dropdown">
                                <button class="btn btn-sm w-100 dropdown-toggle badge ${badgeEstatus} border-0 rounded-pill shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="font-size: 0.85em; padding: 6px 10px;">
                                    ${data.estatus}
                                </button>
                                <ul class="dropdown-menu shadow-sm" style="font-size: 0.85em;">
                                    <li><h6 class="dropdown-header">Mover equipo a:</h6></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Almacén')">Almacén</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Proceso')">Proceso</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Por habilitar')">Por habilitar</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Falta pza')">Falta Pieza(s)</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'En garantía')">En garantía</a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger fw-bold" href="#" onclick="cambiarEstatusRapido('${data.serie}', 'Vendido', '${data.fechaEntrega || ''}')">Vendido</a></li>
                                </ul>
                            </div>
                        </td>
                        <td class="text-center" style="white-space: nowrap;">
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="verDetalles('${data.serie}')" title="Ver Ficha Técnica">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-secondary rounded-circle me-1 border" onclick="abrirEdicion('${data.serie}')" title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-sm btn-light text-muted rounded-circle border" title="Abonos" disabled>
                                <i class="fa-solid fa-wallet"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        });

        modalLoading.hide();
    } catch (error) {
        console.error(error);
        modalLoading.hide();
    }
};

document.getElementById('buscadorGeneral').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        paginaActual = 1;
        cargarInventario('inicio', false);
        if (typeof window.scrollToTableHeader === 'function') {
            window.scrollToTableHeader();
        }
    }
});

window.filtrarPorEstatusCard = (estatusDeseado) => {
    const selectEstatus = document.getElementById('filtroEstatus');
    const estatusBuscado = estatusDeseado.trim().toLowerCase();

    let opcionCorrecta = "";
    for (let i = 0; i < selectEstatus.options.length; i++) {
        if (selectEstatus.options[i].value.trim().toLowerCase() === estatusBuscado) {
            opcionCorrecta = selectEstatus.options[i].value;
            break;
        }

    }

    selectEstatus.value = opcionCorrecta;

    if (estatusBuscado === "") {
        document.getElementById('filtroCondicion').value = "";
    }

    paginaActual = 1;
    cargarInventario('inicio', false);
    setTimeout(() => {
        if (typeof window.scrollToTableHeader === 'function') {
            window.scrollToTableHeader();
        }
    }, 700);

    document.getElementById('filtroEstatus').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.filtrarPorCondicionCard = (condicionDeseada) => {
    const selectCondicion = document.getElementById('filtroCondicion');
    const condicionBuscada = condicionDeseada.trim().toLowerCase();

    let opcionCorrecta = "";
    for (let i = 0; i < selectCondicion.options.length; i++) {
        if (selectCondicion.options[i].value.trim().toLowerCase() === condicionBuscada) {
            opcionCorrecta = selectCondicion.options[i].value;
            break;
        }
    }
    selectCondicion.value = opcionCorrecta;

    paginaActual = 1;
    cargarInventario('inicio', false);
    setTimeout(() => {
        if (typeof window.scrollToTableHeader === 'function') {
            window.scrollToTableHeader();
        }
    }, 700);

    document.getElementById('filtroCondicion').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

window.sincronizarStockTienda = async (modoSilencioso = false) => {

    if (!modoSilencioso) {
        const confirmacion = await Swal.fire({
            title: "¿Sincronizar Inventario de Tienda?",
            html: `Se actualizará el stock de la tienda utilizando la vinculación directa <b>(productoId)</b>.<br><small class="text-muted">Esto elimina los errores de coincidencia de texto.</small>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, Sincronizar Stock",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33"
        });

        if (!confirmacion.isConfirmed) return;
    }

    try {
        const elementoTextoCarga = document.getElementById('textoModalCarga');
        let textoOriginal = 'Cargando';

        if (elementoTextoCarga) {
            textoOriginal = elementoTextoCarga.innerText;
            elementoTextoCarga.innerText = modoSilencioso ? 'Sincronizando stock...' : 'Calculando inventario...';
        }

        if (typeof modalCarga !== 'undefined' && modalCarga.show) modalCarga.show();

        // 1. Contar equipos en Almacén agrupados por productoId
        const conteoPorProductoId = {};
        let totalItemsAlmacen = 0;
        let equiposSinVincular = 0;

        const snapAlmacen = await getDocs(collection(db, "almacen"));
        snapAlmacen.forEach(docSnap => {
            const d = docSnap.data();
            const estatus = String(d.estatus || '').trim().toLowerCase();

            if (estatus === 'almacén' || estatus === 'almacen') {
                totalItemsAlmacen++;

                let idsToCount = [];
                if (d.productoIds && Array.isArray(d.productoIds)) {
                    idsToCount = d.productoIds;
                } else if (d.productoId) {
                    idsToCount = [d.productoId];
                }

                if (idsToCount.length > 0) {
                    idsToCount.forEach(id => {
                        const cleanId = String(id).trim();
                        if (cleanId !== "") {
                            conteoPorProductoId[cleanId] = (conteoPorProductoId[cleanId] || 0) + 1;
                        }
                    });
                } else {
                    equiposSinVincular++;
                    console.warn(`Equipo sin vincular (Serie: ${d.serie || docSnap.id})`);
                }
            }
        });

        console.log("Stock contado por productoId:", conteoPorProductoId);

        // 2. Obtener productos de la Tienda y comparar stock
        const snapProductos = await getDocs(collection(db, "productos"));
        const productosAActualizar = [];
        let productosConStockTotal = 0;
        let productosEnCero = 0;

        snapProductos.forEach(docProd => {
            const idTienda = docProd.id;
            const stockActual = Number(docProd.data().stock) || 0;
            const nuevoStock = conteoPorProductoId[idTienda] || 0;

            if (nuevoStock > 0) productosConStockTotal++;
            else productosEnCero++;

            if (stockActual !== nuevoStock) {
                productosAActualizar.push({
                    id: idTienda,
                    stockActual: stockActual,
                    nuevoStock: nuevoStock
                });
            }
        });

        // 3. Actualizar Firebase en lotes
        const batchSize = 450;
        let actualizadosContador = 0;

        for (let i = 0; i < productosAActualizar.length; i += batchSize) {
            const chunk = productosAActualizar.slice(i, i + batchSize);
            const currentBatch = writeBatch(db);

            chunk.forEach(prod => {
                const docRef = doc(db, "productos", prod.id);
                currentBatch.update(docRef, { stock: prod.nuevoStock });
                actualizadosContador++;
            });

            await currentBatch.commit();
            await new Promise(r => setTimeout(r, 100)); // Retardo para no saturar Firestore
        }

        if (typeof modalCarga !== 'undefined' && modalCarga.hide) modalCarga.hide();

        if (elementoTextoCarga) {
            elementoTextoCarga.innerText = textoOriginal;
        }

        if (!modoSilencioso) {
            const htmlReporte = `
                <div class="text-start">
                    <p class="mb-2"><b>Resultados de la Sincronización Definitiva:</b></p>
                    <ul class="mb-3 ps-3">
                        <li>Se actualizaron <b>${actualizadosContador}</b> productos en la Tienda.</li>
                        <li>Productos con stock disponible: <b>${productosConStockTotal}</b></li>
                        <li>Productos ajustados a stock 0: <b>${productosEnCero}</b></li>
                        ${equiposSinVincular > 0 ? `<li class="text-danger">Equipos en almacén sin vincular (falta productoId): <b>${equiposSinVincular}</b></li>` : ''}
                    </ul>
                </div>
            `;

            await Swal.fire({
                title: equiposSinVincular > 0 ? "Sincronizada con Observaciones" : "¡Sincronización Perfecta!",
                html: htmlReporte,
                icon: equiposSinVincular > 0 ? "warning" : "success",
                confirmButtonText: "Excelente"
            });
        }

    } catch (error) {
        if (typeof modalCarga !== 'undefined' && modalCarga.hide) modalCarga.hide();
        const elementoTextoCarga = document.getElementById('textoModalCargar');
        if (elementoTextoCarga) elementoTextoCarga.innerText = 'Cargando';

        console.error("Error crítico:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al actualizar los datos.",
            icon: "error"
        });
    }
};

function ajustarStockProducto(batch, productoId, delta) {
    if (!productoId || delta === 0) return;
    const prodRef = doc(db, "productos", productoId);
    batch.update(prodRef, { stock: increment(delta) });
}

let campoOrden = 'fEntrega' || 'fPago';
let dirOrden = 'asc';

document.querySelectorAll('.sort-option').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();

        window.ordenFechaActivo = false;
        window.ordenClienteAlfabActivo = false;
        window.ordenCategoriaActivo = false;

        document.querySelectorAll('.sort-option').forEach(el => el.classList.remove('active'));
        e.target.classList.add('active');

        campoOrden = e.target.getAttribute('data-campo');
        dirOrden = e.target.getAttribute('data-dir');

        const btnOrdenar = document.getElementById('btnOrdenar');
        btnOrdenar.innerHTML = `<i class="bi bi-sort-down"></i> ${e.target.innerText.split(' (')[0]}`;

        paginaActual = 1;
        cargarInventario('inicio', false);
    });
});

async function calcularTotalValorPorEstatus() {
    try {
        let totalAlmacen = 0, totalProceso = 0, totalHabilitar = 0, totalGarantia = 0, totalPiezas = 0, totalRemate = 0;
        let totalDeTotales = 0;
        const docSnap = await getDocs(collection(db, "usuarios"));
        const u = docSnap.docs.find(doc => doc.id === window.idUsuario);

        (window.inventarioGlobal || []).forEach(d => {
            const est = String(d.estatus || '').trim().toLowerCase();
            const cond = String(d.condicion || '').trim().toLowerCase();
            const precio = Number(d.precioMayorista) || 0;

            if (['almacén', 'almacen'].includes(est)) totalAlmacen += precio;
            else if (['proceso'].includes(est)) totalProceso += precio;
            else if (['por habilitar'].includes(est)) totalHabilitar += precio;
            else if (['en garantía', 'en garantia'].includes(est)) totalGarantia += precio;
            else if (['falta pza'].includes(est)) totalPiezas += precio;

            if (['remate'].includes(cond)) totalRemate += precio;
        });

        totalDeTotales = totalAlmacen + totalProceso + totalHabilitar + totalGarantia + totalPiezas + totalRemate;
        document.getElementById('kpiTotalEstatus').innerText = `$${totalDeTotales.toLocaleString('es-MX')} Total`;
        document.getElementById('kpiValorAlmacen').innerText = `$${totalAlmacen.toLocaleString('es-MX')} Total`;
        document.getElementById('kpiValorProceso').innerHTML = `$${totalProceso.toLocaleString('es-MX')} Total`;
        document.getElementById('kpiValorGarantia').innerHTML = `$${totalGarantia.toLocaleString('es-MX')} Total`;
        document.getElementById('kpiValorPiezas').innerHTML = `$${totalPiezas.toLocaleString('es-MX')} Total`;
        document.getElementById('kpiValorHabilitar').innerHTML = `$${totalHabilitar.toLocaleString('es-MX')} Total`;

        const rolUsuario = u ? u.data().rol : null;
        if (rolUsuario === "Operador") {
            document.getElementById('kpiTotalEstatus').style.display = "block";
            document.getElementById('kpiValorHabilitar').style.display = "block";
            document.getElementById('kpiValorProceso').style.display = "block";
            document.getElementById('kpiValorGarantia').style.display = "block";
            document.getElementById('kpiValorPiezas').style.display = "block";
            document.getElementById('kpiValorAlmacen').style.display = "block";
        } else {
            document.getElementById('kpiTotalEstatus').style.display = "none";
            document.getElementById('kpiValorHabilitar').style.display = "none";
            document.getElementById('kpiValorProceso').style.display = "none";
            document.getElementById('kpiValorGarantia').style.display = "none";
            document.getElementById('kpiValorPiezas').style.display = "none";
            document.getElementById('kpiValorAlmacen').style.display = "none";
        }

    } catch (error) {
        console.error("Error al calcular los totales por estatus:", error);
    }
}

async function calcularTotalValorPorCondicion() {
    const docSnap = await getDocs(collection(db, "usuarios"));
    const u = docSnap.docs.find(doc => doc.id === window.idUsuario);
    try {
        let totalNuevo = 0, totalRefurbished = 0, totalUsado = 0, totalRemate = 0;

        (window.inventarioGlobal || []).forEach(d => {
            const cond = String(d.condicion || '').trim().toLowerCase();
            const precio = Number(d.precioMayorista) || 0;

            if (['nuevo'].includes(cond)) totalNuevo += precio;
            else if (['refurbished'].includes(cond)) totalRefurbished += precio;
            else if (['usado'].includes(cond)) totalUsado += precio;
            else if (['remate'].includes(cond)) totalRemate += precio;
        });

        if (document.getElementById('kpiValorNuevo')) document.getElementById('kpiValorNuevo').innerText = `$${totalNuevo.toLocaleString('es-MX')} Total`;
        if (document.getElementById('kpiValorRefurbished')) document.getElementById('kpiValorRefurbished').innerHTML = `$${totalRefurbished.toLocaleString('es-MX')} Total`;
        if (document.getElementById('kpiValorUsado')) document.getElementById('kpiValorUsado').innerHTML = `$${totalUsado.toLocaleString('es-MX')} Total`;
        if (document.getElementById('kpiValorRemate')) document.getElementById('kpiValorRemate').innerHTML = `$${totalRemate.toLocaleString('es-MX')} Total`;

        const rolUsuario = u ? u.data().rol : null;
        if (rolUsuario === "Operador") {
            document.getElementById('kpiValorRemate').style.display = "block";
        } else {
            document.getElementById('kpiValorRemate').style.display = "none";
        }

    } catch (error) {
        console.error("Error al calcular los totales por condicion:", error);
    }
}

window.cambiarEstatusRapido = async (serie, nuevoEstatus, fechaEntregaActual = '') => {

    try {

        const d = window.inventarioGlobal.find(item => item.serie === serie) || {};

        const estatusTrim = nuevoEstatus.trim();
        const estatusLower = estatusTrim.toLowerCase();

        const estatusActual = String(d.estatus || '').trim().toLowerCase();
        const normalizarEstatus = (est) => {
            if (est === 'almacén' || est === 'almacen') return 'almacen';
            if (est === 'en garantía' || est === 'en garantia') return 'en garantia';
            return est;
        };

        if (normalizarEstatus(estatusActual) === normalizarEstatus(estatusLower)) {
            await Swal.fire({
                title: "Sin Cambios",
                text: "El equipo ya se encuentra en el estatus seleccionado.",
                icon: "info"
            });
            return;
        }

        const tieneCliente = d.cliente && String(d.cliente).trim() !== '' && String(d.cliente).trim().toLowerCase() !== 'sin asignar';
        const tieneFechaEntrega = (fechaEntregaActual && fechaEntregaActual.trim() !== '') || (d.fechaEntrega && String(d.fechaEntrega).trim() !== '');
        const tieneFechaPago = d.fechaPago && String(d.fechaPago).trim() !== '';

        let motivoCliente = tieneCliente ? d.cliente : "";
        let fechaEntregaRapida = fechaEntregaActual || d.fechaEntrega || "";
        let fechaPagoRapida = d.fechaPago || "";

        if (estatusTrim === 'Vendido' || estatusTrim === 'Proceso') {
            const necesitaCliente = !tieneCliente;
            const necesitaFechaEntrega = !tieneFechaEntrega;
            const necesitaFechaPago = (estatusTrim === 'Vendido') && !tieneFechaPago;

            if (necesitaCliente) {
                const motivoClienteResult = await Swal.fire({
                    title: "Cliente Requerido",
                    text: `Por favor, ingresa el cliente para mover el equipo ${serie} a "${estatusTrim}":`,
                    input: "text",
                    showCancelButton: true,
                    confirmButtonText: (necesitaFechaEntrega || necesitaFechaPago) ? "Siguiente" : "Aceptar",
                    cancelButtonText: "Cancelar",
                    inputValidator: (value) => {
                        if (!value || value.trim() === '') {
                            return 'El nombre del cliente es obligatorio';
                        }
                    }
                });
                if (motivoClienteResult.dismiss) return;
                motivoCliente = motivoClienteResult.value.trim();
            }

            if (necesitaFechaEntrega) {
                const fechaEntregaRapidaResult = await Swal.fire({
                    title: "Fecha de Entrega",
                    text: `Ingresa la fecha de entrega para el equipo ${serie}:`,
                    input: "date",
                    inputValue: new Date().toISOString().split('T')[0],
                    showCancelButton: true,
                    confirmButtonText: necesitaFechaPago ? "Siguiente" : "Aceptar",
                    cancelButtonText: "Cancelar",
                    inputValidator: (value) => {
                        if (!value) {
                            return 'La fecha de entrega es obligatoria';
                        }
                    }
                });
                if (fechaEntregaRapidaResult.dismiss) return;
                fechaEntregaRapida = (fechaEntregaRapidaResult.value || '').trim();
            }

            if (necesitaFechaPago) {
                const fechaPagoRapidaResult = await Swal.fire({
                    title: "Fecha de Pago",
                    text: `Ingresa la fecha de pago para el equipo ${serie}:`,
                    input: "date",
                    inputValue: new Date().toISOString().split('T')[0],
                    showCancelButton: true,
                    confirmButtonText: "Aceptar",
                    cancelButtonText: "Cancelar",
                    inputValidator: (value) => {
                        if (!value) {
                            return 'La fecha de pago es obligatoria';
                        }
                    }
                });
                if (fechaPagoRapidaResult.dismiss) return;
                fechaPagoRapida = (fechaPagoRapidaResult.value || '').trim();
            }
        }

        let motivo = "";
        let esteticaInput = "";

        const destinoValido = ['en garantía', 'en garantia', 'falta pza', 'almacén', 'almacen'];
        const requiereMotivo = destinoValido.includes(estatusLower);
        const esGarantiaOPieza = ['en garantía', 'en garantia', 'falta pza', 'almacén', 'almacen'].includes(estatusLower);
        const tieneComentarios = d.comentarios && String(d.comentarios).trim() !== '';
        const tieneEstetica = d.estetica && String(d.estetica).trim() !== '';

        if (requiereMotivo) {
            if (esGarantiaOPieza || !tieneComentarios) {
                const motivoResult = await Swal.fire({
                    title: esGarantiaOPieza ? "Nuevos Comentarios Requeridos" : "Motivo del Movimiento",
                    text: esGarantiaOPieza
                        ? `Vas a mover el equipo ${serie} a "${estatusTrim}". Por favor, ingresa los nuevos comentarios (reemplazarán los anteriores):`
                        : `Vas a mover el equipo ${serie} a "${estatusTrim}". Por favor, ingresa el motivo del movimiento:`,
                    input: "text",
                    showCancelButton: true,
                    confirmButtonText: "Aceptar",
                    cancelButtonText: "Cancelar",
                    inputValidator: (value) => {
                        if (!value || value.trim() === '') {
                            return 'El motivo del movimiento es obligatorio';
                        }
                    }
                });
                if (!motivoResult.isConfirmed) return;
                motivo = motivoResult.value.trim();
            }

            if (!tieneEstetica) {
                const esteticaResult = await Swal.fire({
                    title: "Estética",
                    text: `Por favor, ingresa un valor para la estética del equipo ${serie}:`,
                    input: "text",
                    showCancelButton: true,
                    confirmButtonText: "Aceptar",
                    cancelButtonText: "Cancelar",
                    inputValidator: (value) => {
                        if (!value || value.trim() === '') {
                            return 'El valor de la estética es obligatorio';
                        }
                    }
                });
                if (!esteticaResult.isConfirmed) return;
                esteticaInput = esteticaResult.value.trim();
            }
        }

        const hoyStr = new Date().toISOString().split('T')[0];
        const fechaManualResult = await Swal.fire({
            title: "Fecha del Movimiento",
            text: "Ingresa la fecha del movimiento (Formato AAAA-MM-DD):",
            input: "text",
            inputValue: hoyStr,
            showCancelButton: true,
            confirmButtonText: "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
                    return 'La fecha del movimiento es obligatoria en formato AAAA-MM-DD';
                }
            }
        });
        const fechaManual = fechaManualResult.isConfirmed ? (fechaManualResult.value || '') : null;

        if (fechaManual === null) return;

        const fechaParseada = new Date(fechaManual + "T00:00:00");
        if (isNaN(fechaParseada.getTime())) {
            await Swal.fire({
                title: "Acción Cancelada",
                text: "El formato de la fecha es inválido. Usa el formato AAAA-MM-DD.",
                icon: "error"
            });
            return;
        }

        let tipoPrecio = null;

        if (estatusLower === 'proceso' || estatusLower === 'vendido') {
            const tipoPrecioResult = await Swal.fire({
                title: "Tipo de Precio / Cliente",
                text: `¿Qué tipo de precio/cliente aplica para el equipo ${serie}?`,
                input: "select",
                inputOptions: {
                    "publico": "Precio Público",
                    "mayorista": "Precio Mayorista"
                },
                inputPlaceholder: "Selecciona el tipo de precio",
                showCancelButton: true,
                confirmButtonText: "Aceptar",
                cancelButtonText: "Cancelar",
                inputValidator: (value) => {
                    if (!value) {
                        return "Debes seleccionar un tipo de precio";
                    }
                }
            });

            tipoPrecio = tipoPrecioResult.isConfirmed ? tipoPrecioResult.value : null;
            if (!tipoPrecio) return;
        }

        modalLoading.show();

        const docRef = doc(db, 'almacen', serie);

        const comentariosFinal = esGarantiaOPieza ? motivo : (tieneComentarios ? d.comentarios : motivo);
        const esteticaFinal = tieneEstetica ? d.estetica : esteticaInput;

        const dataActualizacion = {
            estatus: estatusTrim,
            ultimoMovimiento: requiereMotivo ? (motivo ? motivo : (d.comentarios || `Cambio de estatus rápido a "${estatusTrim}"`)) : `Cambio de estatus rápido a "${estatusTrim}"`,
            fechaMovimiento: fechaParseada
        };
        if (estatusLower === 'proceso' || estatusLower === 'vendido') {
            dataActualizacion.tipoPrecioAbono = tipoPrecio;
            dataActualizacion.tipoCliente = tipoPrecio || '';
        }

        if (requiereMotivo) {
            dataActualizacion.comentarios = comentariosFinal;
            dataActualizacion.estetica = esteticaFinal;
        }

        const nuevoHistorial = window.procesarTransicionGarantia(d, estatusTrim, fechaParseada, dataActualizacion.ultimoMovimiento, comentariosFinal);
        if (nuevoHistorial) {
            dataActualizacion.historialGarantias = nuevoHistorial;
        }

        if (estatusTrim === 'Vendido' || estatusTrim === 'Proceso') {
            dataActualizacion.cliente = motivoCliente;
            dataActualizacion.fechaEntrega = fechaEntregaRapida;
        }

        if (estatusTrim === 'Vendido') {
            dataActualizacion.fechaPago = fechaPagoRapida;
        }

        if (estatusLower === 'almacén' || estatusLower === 'almacen') {
            dataActualizacion.cliente = "";
            dataActualizacion.fechaPago = "";
            dataActualizacion.fechaEntrega = "";
            dataActualizacion.historialAbonos = [];
        }

        const idsActualizar = d.productoIds || (d.productoId ? [d.productoId] : []);
        if (idsActualizar.length > 0) {
            const eraAlmacen = (normalizarEstatus(estatusActual) === 'almacen');
            const esAlmacen = (normalizarEstatus(estatusLower) === 'almacen');

            let delta = 0;
            if (!eraAlmacen && esAlmacen) delta = 1;
            else if (eraAlmacen && !esAlmacen) delta = -1;

            if (delta !== 0) {
                for (const id of idsActualizar) {
                    const prodRef = doc(db, 'productos', id);
                    await updateDoc(prodRef, { stock: increment(delta) });
                }
            }
        }

        await updateDoc(docRef, dataActualizacion);

        const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
        if (index !== -1) {
            window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...dataActualizacion };
        }

        await Swal.fire({
            title: "Actualización Completada",
            text: `Estatus actualizado a "${estatusTrim}" para la serie: "${serie}"`,
            icon: "success"
        });

        await cargarInventario('inicio', true);

    } catch (error) {
        console.error("Error al actualizar el estatus:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al intentar cambiar el estatus.",
            icon: "error"
        });
    } finally {
        setTimeout(() => modalLoading.hide(), 500);
    }
};

window.abrirEdicion = async (serie) => {
    try {
        modalLoading.show();
        const docRef = doc(db, 'almacen', serie);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            modalLoading.hide();
            await Swal.fire({
                title: "No Encontrado",
                text: "El registro no existe.",
                icon: "error"
            });
            return;
        }

        const d = snap.data();

        document.getElementById('editSerie').value = d.serie || '';
        document.getElementById('editLot').value = d.nLot || '';

        const catSelect = document.getElementById('editCategoria');
        if ([...catSelect.options].some(o => o.value === d.categoria)) catSelect.value = d.categoria;

        const condSelect = document.getElementById('editCondicion');
        if ([...condSelect.options].some(o => o.value === d.condicion)) condSelect.value = d.condicion;

        const estatusSelect = document.getElementById('editEstatus');
        if ([...estatusSelect.options].some(o => o.value === d.estatus)) estatusSelect.value = d.estatus;

        document.getElementById('editMarca').value = d.marca || '';
        document.getElementById('editModelo').value = d.modelo || '';
        document.getElementById('editProcesador').value = d.procesador || '';
        document.getElementById('editRam').value = d.ram || '';
        document.getElementById('editHdd').value = d.hdd || '';
        document.getElementById('editSsd').value = d.ssd || '';
        document.getElementById('editPantalla').value = d.pantalla || '';
        document.getElementById('editOs').value = d.os || '';
        document.getElementById('editCliente').value = d.cliente || '';
        const editTipoClienteSelect = document.getElementById('editTipoClienteNuevo');
        if (editTipoClienteSelect) {
            editTipoClienteSelect.value = d.tipoPrecioAbono || 'publico';
        }
        document.getElementById('editPrecioMayorista').value = d.precioMayorista || '';
        document.getElementById('editPrecioPublico').value = d.precioPublico || '';
        document.getElementById('editFechaPago').value = d.fechaPago || '';
        document.getElementById('editFechaEntrega').value = d.fechaEntrega || '';
        document.getElementById('editGeneracion').value = d.generacion || '';
        document.getElementById('editVelocidad').value = d.velocidad || '';
        document.getElementById('editTipoRam').value = d.tipoRam || '';
        document.getElementById('editVideo').value = d.videoDedicado || '';
        document.getElementById('editColor').value = d.color || '';
        document.getElementById('editLicencia').value = d.licencia || '';
        document.getElementById('editDescVideo').value = d.descVideo || '';
        document.getElementById('editDiscoExtra').value = d.discoExtra || '';
        document.getElementById('editCapacidadExtra').value = d.capacidadExtra || '';
        document.getElementById('editCam').value = d.cam || '';
        document.getElementById('editCdDvd').value = d.cddvd || '';
        document.getElementById('editWifi').value = d.wifi || '';
        document.getElementById('editBluetooth').value = d.bluetooth || '';
        document.getElementById('editEstetica').value = d.estetica || '';
        document.getElementById('editComentarios').value = d.comentarios || '';

        modalLoading.hide();
        const modalEdit = new bootstrap.Modal(document.getElementById('modalEditarRegistro'));
        modalEdit.show();

    } catch (error) {
        modalLoading.hide();
        console.error("Error al cargar detalles para edición:", error);
    }
};

const formEditar = document.getElementById('formEditar');
if (formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnEditarEquipo = document.getElementById('btnEditarEquipo');

        const serie = document.getElementById('editSerie').value;
        const docRef = doc(db, 'almacen', serie);
        const estStatus = document.getElementById('editEstatus').value.trim().toLowerCase();
        const esAlmacen = estStatus === 'almacén' || estStatus === 'almacen';

        const d = window.inventarioGlobal.find(item => item.serie === serie) || {};
        const destinoValido = ['en garantía', 'en garantia', 'falta pza'];
        const estOriginal = String(d.estatus || '').trim().toLowerCase();

        const normalizarEstatusLocal = (est) => {
            const e = String(est || '').trim().toLowerCase();
            if (e === 'en garantía' || e === 'en garantia') return 'en garantia';
            return e;
        };

        if (normalizarEstatusLocal(estOriginal) !== normalizarEstatusLocal(estStatus) && destinoValido.includes(estStatus)) {
            const comentariosVal = document.getElementById('editComentarios').value.trim();
            const esteticaVal = document.getElementById('editEstetica').value.trim();
            const comentariosOriginales = (d.comentarios || '').trim();

            if (comentariosVal === '' || comentariosVal === comentariosOriginales) {
                await Swal.fire({
                    title: "Nuevos Comentarios Requeridos",
                    text: "Debe ingresar nuevos comentarios u observaciones (diferentes a los anteriores) al cambiar a este estatus.",
                    icon: "warning"
                });
                return;
            }
            if (esteticaVal === '') {
                await Swal.fire({
                    title: "Estética Requerida",
                    text: "Debe ingresar el valor de la estética al cambiar a este estatus.",
                    icon: "warning"
                });
                return;
            }
        }

        const datosActualizados = {
            nLot: document.getElementById('editLot').value,
            categoria: document.getElementById('editCategoria').value,
            condicion: document.getElementById('editCondicion').value,
            estatus: document.getElementById('editEstatus').value,
            cliente: esAlmacen ? '' : document.getElementById('editCliente').value,
            tipoPrecioAbono: document.getElementById('editTipoClienteNuevo') ? document.getElementById('editTipoClienteNuevo').value : 'publico',
            precioMayorista: Number(document.getElementById('editPrecioMayorista').value) || 0,
            precioPublico: Number(document.getElementById('editPrecioPublico').value) || 0,
            fechaPago: esAlmacen ? '' : document.getElementById('editFechaPago').value,
            fechaEntrega: esAlmacen ? '' : document.getElementById('editFechaEntrega').value,
            marca: document.getElementById('editMarca').value,
            modelo: document.getElementById('editModelo').value,
            procesador: document.getElementById('editProcesador').value,
            generacion: document.getElementById('editGeneracion').value,
            velocidad: document.getElementById('editVelocidad').value,
            ram: document.getElementById('editRam').value,
            tipoRam: document.getElementById('editTipoRam').value,
            videoDedicado: document.getElementById('editVideo').value,
            descVideo: document.getElementById('editDescVideo').value,
            hdd: document.getElementById('editHdd').value,
            ssd: document.getElementById('editSsd').value,
            discoExtra: document.getElementById('editDiscoExtra').value,
            capacidadExtra: document.getElementById('editCapacidadExtra').value,
            pantalla: document.getElementById('editPantalla').value,
            os: document.getElementById('editOs').value,
            color: document.getElementById('editColor').value,
            licencia: document.getElementById('editLicencia').value,
            cam: document.getElementById('editCam').value,
            cddvd: document.getElementById('editCdDvd').value,
            wifi: document.getElementById('editWifi').value,
            bluetooth: document.getElementById('editBluetooth').value,
            estetica: document.getElementById('editEstetica').value,
            comentarios: document.getElementById('editComentarios').value,
            ultimaEdicionManual: new Date()
        };

        const nuevoHistorial = window.procesarTransicionGarantia(d, datosActualizados.estatus, new Date(), "Edición manual", datosActualizados.comentarios);
        if (nuevoHistorial) {
            datosActualizados.historialGarantias = nuevoHistorial;
        }

        try {

            btnEditarEquipo.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Guardando...';
            btnEditarEquipo.disabled = true;

            bootstrap.Modal.getInstance(document.getElementById('modalEditarRegistro')).hide();
            modalLoading.show();

            await updateDoc(docRef, datosActualizados);

            const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
            if (index !== -1) {
                window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...datosActualizados };
            }

            cargarInventario('inicio', false);

            setTimeout(async () => {
                modalLoading.hide();
                btnEditarEquipo.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios';
                btnEditarEquipo.disabled = false;
                await Swal.fire({
                    title: "Actualización Exitosa",
                    text: `El equipo ${serie} fue actualizado correctamente.`,
                    icon: "success"
                });
            }, 500);

        } catch (error) {
            modalLoading.hide();
            btnEditarEquipo.innerHTML = '<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios';
            btnEditarEquipo.disabled = false;
            console.error("Error al actualizar:", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al guardar los cambios.",
                icon: "error"
            });
        }
    });

    const editEstatusSelect = document.getElementById('editEstatus');
    if (editEstatusSelect) {
        editEstatusSelect.addEventListener('change', () => {
            const val = editEstatusSelect.value.trim().toLowerCase();
            if (val === 'almacén' || val === 'almacen') {
                const editClienteInput = document.getElementById('editCliente');
                const editFechaPagoInput = document.getElementById('editFechaPago');
                const editFechaEntregaInput = document.getElementById('editFechaEntrega');
                if (editClienteInput) editClienteInput.value = '';
                const editTipoClienteSelect = document.getElementById('editTipoClienteNuevo');
                if (editTipoClienteSelect) editTipoClienteSelect.value = 'publico';
                if (editFechaPagoInput) editFechaPagoInput.value = '';
                if (editFechaEntregaInput) editFechaEntregaInput.value = '';
            }
        });
    }
}

const chkActualizarFechaEntrega = document.getElementById('chkActualizarFechaEntrega');
const editFechaEntregaMasiva = document.getElementById('editFechaEntregaMasiva');
if (chkActualizarFechaEntrega && editFechaEntregaMasiva) {
    chkActualizarFechaEntrega.addEventListener('change', () => {
        editFechaEntregaMasiva.disabled = !chkActualizarFechaEntrega.checked;
        if (!chkActualizarFechaEntrega.checked) {
            editFechaEntregaMasiva.value = '';
        }
    });
}

const chkActualizarFechaPago = document.getElementById('chkActualizarFechaPago');
const editFechaPagoMasiva = document.getElementById('editFechaPagoMasiva');
if (chkActualizarFechaPago && editFechaPagoMasiva) {
    chkActualizarFechaPago.addEventListener('change', () => {
        editFechaPagoMasiva.disabled = !chkActualizarFechaPago.checked;
        if (!chkActualizarFechaPago.checked) {
            editFechaPagoMasiva.value = '';
        }
    });
}

const formEditarFechasMasivo = document.getElementById('formEditarFechasMasivo');
if (formEditarFechasMasivo) {
    formEditarFechasMasivo.addEventListener('submit', async (e) => {
        e.preventDefault();

        const seleccionados = window.obtenerSeleccionados();
        if (seleccionados.length === 0) return;

        const actEntrega = document.getElementById('chkActualizarFechaEntrega').checked;
        const actPago = document.getElementById('chkActualizarFechaPago').checked;

        if (!actEntrega && !actPago) {
            await Swal.fire({
                title: "Acción Requerida",
                text: "Debes seleccionar al menos un campo de fecha para actualizar.",
                icon: "warning"
            });
            return;
        }

        const fechaEntregaVal = document.getElementById('editFechaEntregaMasiva').value;
        const fechaPagoVal = document.getElementById('editFechaPagoMasiva').value;

        try {
            const modalEl = document.getElementById('modalEditarFechasMasivo');
            // Intentar obtener la instancia del modal y ocultarla si existe
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            } else {
                // Si por alguna razón no se recupera la instancia, ocultarlo mediante jquery o JS directo
                const modalBS = new bootstrap.Modal(modalEl);
                modalBS.hide();
            }

            modalLoading.show();

            const fechaMov = new Date();

            // Pre-filtrar para evitar escrituras redundantes si las fechas ya coinciden
            const seleccionadosFiltrados = seleccionados.filter(serie => {
                const d = window.inventarioGlobal.find(item => item.serie === serie);
                if (!d) return true;
                if (actEntrega && d.fechaEntrega !== fechaEntregaVal) return true;
                if (actPago && d.fechaPago !== fechaPagoVal) return true;
                return false;
            });

            if (seleccionadosFiltrados.length === 0) {
                await Swal.fire({
                    title: "Sin Cambios",
                    text: "Todos los equipos seleccionados ya tienen las fechas indicadas.",
                    icon: "info"
                });
                return;
            }

            const batchSize = 490;
            for (let i = 0; i < seleccionadosFiltrados.length; i += batchSize) {
                const chunk = seleccionadosFiltrados.slice(i, i + batchSize);
                const currentBatch = writeBatch(db);

                chunk.forEach(serie => {
                    if (!serie || serie === 'undefined') return;

                    const docRef = doc(db, 'almacen', serie);
                    const dataActualizacion = {
                        fechaMovimiento: fechaMov,
                        ultimoMovimiento: "Edición masiva de fechas"
                    };

                    if (actEntrega) {
                        dataActualizacion.fechaEntrega = fechaEntregaVal;
                    }
                    if (actPago) {
                        dataActualizacion.fechaPago = fechaPagoVal;
                    }

                    currentBatch.update(docRef, dataActualizacion);
                });

                await currentBatch.commit();
                await new Promise(r => setTimeout(r, 150)); // Retardo para no saturar Firestore
            }

            window.seriesSeleccionadasGlobal.clear();
            window.seleccionGlobal = false;
            const chkAll = document.getElementById('chkSelectAll');
            if (chkAll) chkAll.checked = false;
            verificarSeleccion();

            await Swal.fire({
                title: "Actualización Exitosa",
                text: `Fechas actualizadas correctamente para ${seleccionados.length} equipos.`,
                icon: "success"
            });
            cargarInventario('inicio', true);
        } catch (error) {
            console.error("Error al actualizar fechas masivamente:", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al intentar actualizar las fechas masivamente.",
                icon: "error"
            });
        } finally {
            modalLoading.hide();
        }
    });
}

document.getElementById('btnSiguiente').addEventListener('click', () => {
    paginaActual++;
    cargarInventario('siguiente');
});

document.getElementById('btnAnterior').addEventListener('click', () => {
    paginaActual--;
    cargarInventario('anterior');
});

document.getElementById('btnInicio').addEventListener('click', () => {
    paginaActual = 1;
    cargarInventario();
});

const formRegistro = document.getElementById('formRegistro');
const btnPDFDescargarDetalle = document.getElementById('btnDescargarPDFDetalle');

let regSerieTimeout;
document.getElementById('regSerie').addEventListener('input', function () {
    const inputField = this;
    inputField.classList.remove('is-invalid');
    inputField.setCustomValidity('');

    clearTimeout(regSerieTimeout);
    let serieInput = inputField.value.trim().replace(/\//g, '-');
    if (!serieInput) return;

    regSerieTimeout = setTimeout(async () => {
        const docRef = doc(db, 'almacen', serieInput);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            inputField.classList.add('is-invalid');
            inputField.setCustomValidity('Esta serie ya existe en el inventario.');
            inputField.reportValidity();
        }
    }, 400);
});

document.getElementById('regSerie').addEventListener('keydown', async function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(regSerieTimeout);
        let serieInput = this.value.trim().replace(/\//g, '-');
        if (!serieInput) return;

        const docRef = doc(db, 'almacen', serieInput);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            this.classList.add('is-invalid');
            this.setCustomValidity('Esta serie ya existe en el inventario.');
            this.reportValidity();
        } else {
            this.classList.remove('is-invalid');
            this.setCustomValidity('');
            const nextField = document.getElementById('regCategoria');
            if (nextField) nextField.focus();
        }
    }
});

formRegistro.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
    }
});

formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btnRegistrarEquipo = document.getElementById('btnRegistrarEquipo');
    const originalText = btnRegistrarEquipo.innerHTML;

    btnRegistrarEquipo.disabled = true;
    btnRegistrarEquipo.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Registrando...';

    let serieInput = document.getElementById('regSerie').value.trim().toUpperCase();
    serieInput = serieInput.replace(/\//g, '-');
    const docRef = doc(db, 'almacen', serieInput);
    const regEst = document.getElementById('regEstatus').value.trim().toLowerCase();
    const esAlmacen = regEst === 'almacén' || regEst === 'almacen';

    const docSnap = await getDoc(docRef);
    const inputSerie = document.getElementById('regSerie');

    if (docSnap.exists()) {
        inputSerie.classList.add('is-invalid');
        inputSerie.setCustomValidity('Esta serie ya existe en el inventario.');
        inputSerie.reportValidity();

        btnRegistrarEquipo.disabled = false;
        btnRegistrarEquipo.innerHTML = originalText;
        return;
    }

    inputSerie.classList.remove('is-invalid');
    inputSerie.setCustomValidity('');


    const nuevoEquipo = {
        nLot: document.getElementById('regLot').value,
        serie: serieInput,
        categoria: document.getElementById('regCategoria').value,
        condicion: document.getElementById('regCondicion').value,
        estatus: document.getElementById('regEstatus').value,
        cliente: esAlmacen ? '' : document.getElementById('regCliente').value,
        tipoPrecioAbono: document.getElementById('regTipoClienteNuevo') ? document.getElementById('regTipoClienteNuevo').value : 'publico',
        precioMayorista: Number(document.getElementById('regPrecioMayorista').value) || 0,
        precioPublico: Number(document.getElementById('regPrecioPublico').value) || 0,
        marca: document.getElementById('regMarca').value,
        modelo: document.getElementById('regModelo').value,
        procesador: document.getElementById('regProcesador').value,
        generacion: document.getElementById('regGeneracion').value,
        velocidad: document.getElementById('regVelocidad').value,
        ram: document.getElementById('regRam').value,
        tipoRam: document.getElementById('regTipoRam').value,
        videoDedicado: document.getElementById('regVideo').value,
        color: document.getElementById('regColor').value,
        licencia: document.getElementById('regLicencia').value,
        hdd: document.getElementById('regHdd').value,
        ssd: document.getElementById('regSsd').value,
        pantalla: document.getElementById('regPantalla').value,
        os: document.getElementById('regOs').value,
        estetica: document.getElementById('regEstetica').value,
        descVideo: document.getElementById('regDescVideo').value,
        comentarios: document.getElementById('regComentarios').value,
        discoExtra: document.getElementById('regDiscoExtra').value,
        capacidadExtra: document.getElementById('regCapacidadExtra').value,
        cam: document.getElementById('regCam').value,
        cddvd: document.getElementById('regCdDvd').value,
        wifi: document.getElementById('regWifi').value,
        bluetooth: document.getElementById('regBluetooth').value,
        fechaEntrega: esAlmacen ? '' : document.getElementById('regFechaEntrega').value,
        fechaPago: esAlmacen ? '' : document.getElementById('regFechaPago').value,
        ultimaSincronizacion: new Date()
    };

    const regEstLower = nuevoEquipo.estatus.toLowerCase();
    if (regEstLower === 'en garantía' || regEstLower === 'en garantia') {
        nuevoEquipo.historialGarantias = [{
            fechaEntrada: new Date().toISOString().split('T')[0],
            fechaSalida: null,
            motivo: "Registro inicial en garantía",
            comentarios: nuevoEquipo.comentarios || ""
        }];
    } else {
        nuevoEquipo.historialGarantias = [];
    }

    try {
        await setDoc(docRef, nuevoEquipo, { merge: true });

        const index = window.inventarioGlobal.findIndex(item => item.serie === nuevoEquipo.serie);
        if (index !== -1) {
            window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...nuevoEquipo };
        } else {
            window.inventarioGlobal.push(nuevoEquipo);
        }

        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'success',
            title: 'Equipo registrado con éxito'
        });
        formRegistro.reset();

        bootstrap.Modal.getInstance(document.getElementById('modalNuevoRegistro')).hide();

        cargarInventario('inicio', false);
    } catch (error) {
        console.log("Error al guardar", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al registrar el equipo.",
            icon: "error"
        });
    } finally {
        btnRegistrarEquipo.disabled = false;
        btnRegistrarEquipo.innerHTML = originalText;
    }
    cargarInventario('inicio', false);

});

const btnAbrirModalClonar = document.getElementById('btnAbrirModalClonar');
let modalClonarEquipoInst;

if (btnAbrirModalClonar) {
    btnAbrirModalClonar.addEventListener('click', () => {
        window.contextoClonacion = null;
        const modalNuevoRegistroEl = document.getElementById('modalNuevoRegistro');
        const modalNuevo = bootstrap.Modal.getInstance(modalNuevoRegistroEl);
        if (modalNuevo) modalNuevo.hide();

        setTimeout(() => {
            const inputBuscador = document.getElementById('buscadorClonar');
            const selectCat = document.getElementById('filtroCategoriaClonar');
            if (inputBuscador) inputBuscador.value = '';
            if (selectCat) selectCat.value = '';
            const tituloClonar = document.querySelector('#modalClonarEquipo .modal-title');
            if (tituloClonar) {
                tituloClonar.innerHTML = `<div class="modal-icon-badge primary"><i class="fa-solid fa-search"></i></div> Buscar Equipo Base`;
            }
            if (!modalClonarEquipoInst) modalClonarEquipoInst = new bootstrap.Modal(document.getElementById('modalClonarEquipo'));
            modalClonarEquipoInst.show();
            renderTablaClonar();
        }, 150);
    });
}

const modalClonarEquipoEl = document.getElementById('modalClonarEquipo');
if (modalClonarEquipoEl) {
    modalClonarEquipoEl.addEventListener('hidden.bs.modal', () => {
        if (window.contextoClonacion === 'coti') {
            const modalEl = document.getElementById('modalCrearCotizacion');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        } else if (window.contextoClonacion === 'nota') {
            const modalEl = document.getElementById('modalCrearNotaVenta');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        } else if (window.contextoClonacion === 'acta') {
            const modalEl = document.getElementById('modalActaEntrega');
            const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
            modal.show();
        } else {
            const modalNuevoRegistroEl = document.getElementById('modalNuevoRegistro');
            const modalNuevo = bootstrap.Modal.getInstance(modalNuevoRegistroEl) || new bootstrap.Modal(modalNuevoRegistroEl);
            modalNuevo.show();
        }
    });
}

const btnLimpiarNuevosRegistros = document.getElementById('btnLimpiarNuevosRegistros');
if (btnLimpiarNuevosRegistros) {
    btnLimpiarNuevosRegistros.addEventListener('click', async () => {
        const limpiarConfirm = await Swal.fire({
            title: "¿Está seguro de limpiar los campos?",
            text: "Se borrarán todos los datos ingresados.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí",
            cancelButtonText: "No"
        });
        if (limpiarConfirm.isConfirmed) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                icon: 'success',
                title: 'Campos limpiados correctamente'
            });
            document.getElementById('formRegistro').reset();
        }
    });
}

function renderTablaClonar() {
    const cuerpoTabla = document.getElementById('cuerpoTablaClonar');
    const buscador = document.getElementById('buscadorClonar').value.trim().toLowerCase();
    const categoria = document.getElementById('filtroCategoriaClonar').value.trim().toLowerCase();

    let trs = '';

    const filtrados = window.inventarioGlobal.filter(item => {
        let pasa = true;
        if (categoria !== '' && String(item.categoria || '').trim().toLowerCase() !== categoria) pasa = false;

        if (pasa && buscador !== '') {
            const terminos = buscador.split(' ').filter(t => t.trim() !== '');
            const marcaModelo = (String(item.marca || '') + ' ' + String(item.modelo || '') + ' ' + String(item.procesador || '') + ' ' + String(item.ram || ''));
            const cumple = terminos.every(t => marcaModelo.toLowerCase().includes(t));
            if (!cumple) pasa = false;
        }

        if (pasa && (window.contextoClonacion === 'coti' || window.contextoClonacion === 'nota')) {
            const estatus = String(item.estatus || '').trim().toLowerCase();
            if (estatus !== 'almacén' && estatus !== 'almacen') pasa = false;
        }

        return pasa;
    });

    const agrupados = {};
    filtrados.forEach(item => {
        const key = `${item.marca}|${item.modelo}|${item.procesador}|${item.ram}|${item.hdd}|${item.ssd}`;
        if (!agrupados[key]) agrupados[key] = item;
    });

    const limitados = Object.values(agrupados).slice(0, 50);

    if (limitados.length === 0) {
        trs = '<tr><td colspan="5" class="text-center text-muted">No se encontraron modelos</td></tr>';
    } else {
        limitados.forEach(item => {
            const tr = document.createElement('tr');
            const marcaModelo = `${item.marca || ''} ${item.modelo || ''}`.trim() || 'Sin Marca/Modelo';
            const alm = [item.hdd, item.ssd, item.discoExtra, item.capacidadExtra].filter(a => a && String(a).trim() !== '').join(' + ');

            tr.innerHTML = `
                <td>${marcaModelo} <br><small class="text-muted">${item.categoria || ''}</small></td>
                <td>${item.procesador || ''} <br><small class="text-muted">${item.generacion || ''}</small></td>
                <td class="text-center">${item.ram || ''} ${item.tipoRam || ''}</td>
                <td class="text-center">${alm || 'N/A'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-success" type="button" onclick="clonarEquipoPorSerie('${item.serie}')">
                        <i class="fa-solid fa-check"></i>
                    </button>
                </td>
            `;
            trs += tr.outerHTML;
        });
    }

    cuerpoTabla.innerHTML = trs;
}

const buscadorClonarEl = document.getElementById('buscadorClonar');
if (buscadorClonarEl) {
    buscadorClonarEl.addEventListener('input', renderTablaClonar);
    document.getElementById('filtroCategoriaClonar').addEventListener('change', renderTablaClonar);
    document.getElementById('btnBuscarClonar').addEventListener('click', renderTablaClonar);
}

window.clonarEquipoPorSerie = (serie) => {
    const eqMatch = window.inventarioGlobal.find(e => e.serie === serie);
    if (!eqMatch) return;

    if (window.contextoClonacion === 'coti') {
        const tipoCliente = document.getElementById('regTipoClienteCoti').value;
        const precioM = Number(eqMatch.precioMayorista) || 0;
        const precioP = Number(eqMatch.precioPublico) || 0;
        const costoInicial = tipoCliente === 'mayorista' ? (precioM || precioP || 0) : (precioP || precioM || 0);

        let descripcion = `${eqMatch.categoria || ''} ${eqMatch.marca || ''} ${eqMatch.modelo || ''}\nProcesador: ${eqMatch.procesador || ''} ${eqMatch.generacion || ''} - RAM: ${eqMatch.ram || ''}\nAlmacenamiento: SSD ${eqMatch.ssd || 'N/A'} / HDD ${eqMatch.hdd || 'N/A'}\nSistema Operativo: ${eqMatch.os || 'Sin SO'}`;

        agregarFilaCoti(eqMatch.serie || 'CODM', descripcion, costoInicial, 1, precioM, precioP);

        if (modalClonarEquipoInst) modalClonarEquipoInst.hide();

        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'success',
            title: 'Modelo agregado a la cotización'
        });
    } else if (window.contextoClonacion === 'nota') {
        const tipoCliente = document.getElementById('regTipoClienteNota').value;
        const precioM = Number(eqMatch.precioMayorista) || 0;
        const precioP = Number(eqMatch.precioPublico) || 0;
        const costoInicial = tipoCliente === 'mayorista' ? (precioM || precioP || 0) : (precioP || precioM || 0);

        let descripcion = `${eqMatch.categoria || ''} ${eqMatch.marca || ''} ${eqMatch.modelo || ''}\nProcesador: ${eqMatch.procesador || ''} ${eqMatch.generacion || ''} - RAM: ${eqMatch.ram || ''}\nAlmacenamiento: SSD ${eqMatch.ssd || 'N/A'} / HDD ${eqMatch.hdd || 'N/A'}\nSistema Operativo: ${eqMatch.os || 'Sin SO'}`;

        agregarFilaNota(eqMatch.serie || 'CODM', descripcion, costoInicial, 1, precioM, precioP);

        if (modalClonarEquipoInst) modalClonarEquipoInst.hide();

        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'success',
            title: 'Modelo agregado a la nota de venta'
        });
    } else if (window.contextoClonacion === 'acta') {
        let specs = `${eqMatch.procesador || ''} ${eqMatch.generacion || ''}\nRAM: ${eqMatch.ram || ''} ${eqMatch.tipoRam || ''}\nAlmacenamiento: SSD ${eqMatch.ssd || 'No'} / HDD ${eqMatch.hdd || 'No'}`;
        if (eqMatch.descVideo && eqMatch.descVideo !== 'Integrados') {
            specs += `\nVideo: ${eqMatch.descVideo}`;
        }
        if (eqMatch.os) {
            specs += `\nOS: ${eqMatch.os}`;
        }

        agregarFilaActa(
            eqMatch.categoria || 'Equipo',
            eqMatch.marca || '',
            eqMatch.modelo || '',
            eqMatch.serie || '',
            specs.trim(),
            eqMatch.condicion || eqMatch.estatus || 'Refurbished'
        );

        if (modalClonarEquipoInst) modalClonarEquipoInst.hide();

        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'success',
            title: 'Equipo agregado al Acta de Entrega'
        });
    } else {
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

        setVal('regPrecioMayorista', eqMatch.precioMayorista);
        setVal('regPrecioPublico', eqMatch.precioPublico);
        setVal('regCategoria', eqMatch.categoria);
        setVal('regMarca', eqMatch.marca);
        setVal('regModelo', eqMatch.modelo);
        setVal('regProcesador', eqMatch.procesador);
        setVal('regGeneracion', eqMatch.generacion);
        setVal('regVelocidad', eqMatch.velocidad);
        setVal('regRam', eqMatch.ram);
        setVal('regTipoRam', eqMatch.tipoRam);
        setVal('regVideo', eqMatch.videoDedicado);
        setVal('regDescVideo', eqMatch.descVideo);
        setVal('regColor', eqMatch.color);
        setVal('regLicencia', eqMatch.licencia);
        setVal('regHdd', eqMatch.hdd);
        setVal('regSsd', eqMatch.ssd);
        setVal('regPantalla', eqMatch.pantalla);
        setVal('regOs', eqMatch.os);
        setVal('regDiscoExtra', eqMatch.discoExtra);
        setVal('regCapacidadExtra', eqMatch.capacidadExtra);
        setVal('regCam', eqMatch.cam);
        setVal('regCdDvd', eqMatch.cddvd);
        setVal('regWifi', eqMatch.wifi);
        setVal('regBluetooth', eqMatch.bluetooth);

        if (modalClonarEquipoInst) modalClonarEquipoInst.hide();

        Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            icon: 'success',
            title: 'Campos base autocompletados'
        });
    }
}

const regEstatusSelect = document.getElementById('regEstatus');
if (regEstatusSelect) {
    regEstatusSelect.addEventListener('change', () => {
        const val = regEstatusSelect.value.trim().toLowerCase();
        if (val === 'almacén' || val === 'almacen') {
            const regClienteInput = document.getElementById('regCliente');
            const regFechaPagoInput = document.getElementById('regFechaPago');
            const regFechaEntregaInput = document.getElementById('regFechaEntrega');
            if (regClienteInput) regClienteInput.value = '';
            const regTipoClienteSelect = document.getElementById('regTipoClienteNuevo');
            if (regTipoClienteSelect) regTipoClienteSelect.value = 'publico';
            if (regFechaPagoInput) regFechaPagoInput.value = '';
            if (regFechaEntregaInput) regFechaEntregaInput.value = '';
        }
    });
}

async function exportarAEXCEL() {
    const confirmExpExcel = await Swal.fire({
        title: '¿Estás seguro de que deseas exportar la consulta actual a Excel?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#38915dff',
        cancelButtonColor: '#999999ff',
        confirmButtonText: 'Exportar Excel',
        cancelButtonText: 'Cancelar'
    });
    if (!confirmExpExcel.isConfirmed) return;

    try {
        modalLoading.show();

        const categoriaFiltro = document.getElementById('filtroCategoria') ? document.getElementById('filtroCategoria').value.trim().toLowerCase() : '';
        const estatusFiltro = document.getElementById('filtroEstatus') ? document.getElementById('filtroEstatus').value.trim().toLowerCase() : '';
        const condicionFiltro = document.getElementById('filtroCondicion') ? document.getElementById('filtroCondicion').value.trim().toLowerCase() : '';
        const busqueda = document.getElementById('buscadorGeneral') ? document.getElementById('buscadorGeneral').value.trim().toLowerCase() : '';
        const fechaInicio = document.getElementById('filtroFechaInicio') ? document.getElementById('filtroFechaInicio').value : '';
        const fechaFin = document.getElementById('filtroFechaFin') ? document.getElementById('filtroFechaFin').value : '';

        let resultadosFiltrados = [];

        (window.inventarioGlobal || []).forEach((data) => {
            const catDoc = String(data.categoria || '').trim().toLowerCase();
            const estDoc = String(data.estatus || '').trim().toLowerCase();
            const condDoc = String(data.condicion || '').trim().toLowerCase();

            let pasaFiltros = true;

            if (categoriaFiltro !== '' && catDoc !== categoriaFiltro) pasaFiltros = false;

            if (estatusFiltro !== '') {
                if (estatusFiltro === 'almacén' || estatusFiltro === 'almacen') {
                    if (estDoc !== 'almacén' && estDoc !== 'almacen') pasaFiltros = false;
                } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                    if (estDoc !== 'en garantía' && estDoc !== 'en garantia') pasaFiltros = false;
                } else {
                    if (estDoc !== estatusFiltro) pasaFiltros = false;
                }
            }

            if (condicionFiltro !== '' && condDoc !== condicionFiltro) pasaFiltros = false;

            if (pasaFiltros && window.seriesEscaneadas && window.seriesEscaneadas.size > 0) {
                const serie = String(data.serie || '').trim().toLowerCase();
                if (!window.seriesEscaneadas.has(serie)) {
                    pasaFiltros = false;
                }
            } else if (pasaFiltros && busqueda !== '') {
                const terminos = busqueda.split(' ').filter(t => t.trim() !== '');
                const serie = String(data.serie || '').toLowerCase();
                const marcaModelo = (String(data.marca || '') + ' ' + String(data.modelo || '') + ' ' + String(data.procesador || '') + ' ' + String(data.ram || '').replace(/\s+/g, '')).toLowerCase();
                const cliente = String(data.cliente || '').toLowerCase();
                const lote = String(data.nLot || '').toLowerCase();

                const cumpleBusqueda = terminos.every(termino =>
                    serie.includes(termino) ||
                    marcaModelo.includes(termino) ||
                    cliente.includes(termino)
                );

                if (!cumpleBusqueda) {
                    pasaFiltros = false;
                }
            }

            if (pasaFiltros && (fechaInicio !== '' || fechaFin !== '')) {
                let fEntrega = (data.fechaEntrega && data.fechaEntrega.trim() !== '') ? new Date(data.fechaEntrega + "T00:00:00").toLocaleDateString('es-MX') : '';
                let fPago = (data.fechaPago && data.fechaPago.trim() !== '') ? new Date(data.fechaPago + "T00:00:00").toLocaleDateString('es-MX') : '';
                let fMovimiento = '';

                if (data.fechaMovimiento) {
                    fMovimiento = data.fechaMovimiento.toDate ? data.fechaMovimiento.toDate().toISOString().split('T')[0] : '';
                }

                const checkRango = (fecha) => {
                    if (!fecha || fecha.trim() === '') return false;
                    let f = fecha.trim().substring(0, 10);

                    if (f.includes('/')) {
                        const p = f.split('/');
                        if (p.length === 3) {
                            if (p[2].length === 4) f = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                            else if (p[0].length === 4) f = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
                        }
                    }

                    if (fechaInicio !== '' && f < fechaInicio) return false;
                    if (fechaFin !== '' && f > fechaFin) return false;
                    return true;
                };

                if (!checkRango(fEntrega) && !checkRango(fPago) && !checkRango(fMovimiento)) {
                    pasaFiltros = false;
                }
            }

            if (pasaFiltros) {
                resultadosFiltrados.push(data);
            }
        });

        resultadosFiltrados.sort((a, b) => {
            if (window.ordenCategoriaActivo) {
                let valA = String(a.categoria || '').trim().toLowerCase();
                let valB = String(b.categoria || '').trim().toLowerCase();
                if (valA < valB) return window.ordenCategoriaDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenCategoriaDir === 'asc' ? 1 : -1;
                return 0;
            }

            if (window.ordenClienteAlfabActivo) {
                let valA = String(a.cliente || '').trim().toLowerCase();
                let valB = String(b.cliente || '').trim().toLowerCase();
                if (valA < valB) return window.ordenClienteAlfabDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenClienteAlfabDir === 'asc' ? 1 : -1;
                return 0;
            }

            if (window.ordenFechaActivo) {
                const parseDateStr = (d) => {
                    let f = d.fechaEntrega || d.fechaPago || '';
                    if (!f && d.fechaMovimiento && d.fechaMovimiento.toDate) {
                        f = d.fechaMovimiento.toDate().toISOString().split('T')[0];
                    }
                    if (!f) return 0;
                    let val = String(f).trim();
                    if (val.includes('-')) return Number(val.replace(/-/g, ''));
                    if (val.includes('/')) {
                        const p = val.split('/');
                        if (p.length === 3) {
                            if (p[2].length === 4) return Number(`${p[2]}${p[1].padStart(2, '0')}${p[0].padStart(2, '0')}`);
                            if (p[0].length === 4) return Number(`${p[0]}${p[1].padStart(2, '0')}${p[2].padStart(2, '0')}`);
                        }
                    }
                    return 0;
                };
                let valA = parseDateStr(a);
                let valB = parseDateStr(b);
                if (valA < valB) return window.ordenFechaDir === 'asc' ? -1 : 1;
                if (valA > valB) return window.ordenFechaDir === 'asc' ? 1 : -1;
                return 0;
            }

            let valA = a[campoOrden] || '';
            let valB = b[campoOrden] || '';

            if (campoOrden === 'fechaEntrega') {
                const parseDate = (d) => {
                    if (!d) return 0;
                    if (d.includes('-')) return Number(d.replace(/-/g, ''));
                    if (d.includes('/')) {
                        const p = d.split('/');
                        if (p.length === 3) return Number(`${p[2]}${p[1].padStart(2, '0')}${p[0].padStart(2, '0')}`);
                    }
                    return 0;
                };
                valA = parseDate(valA);
                valB = parseDate(valB);
            }

            if (campoOrden === 'precioMayorista') {
                valA = Number(valA);
                valB = Number(valB);
            }

            if (valA < valB) return dirOrden === 'asc' ? -1 : 1;
            if (valA > valB) return dirOrden === 'asc' ? 1 : -1;
            return 0;
        });

        if (resultadosFiltrados.length === 0) {
            await Swal.fire({
                title: "Sin Datos",
                text: "No hay datos para exportar con los filtros seleccionados.",
                icon: "warning"
            });
            modalLoading.hide();
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inventario');

        worksheet.views = [{ showGridLines: true }];

        worksheet.mergeCells('A1:V1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'REPORTE DE INVENTARIO - ALMACÉN PROSEINET';
        titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC71010' } // Rojo
        };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 35;

        worksheet.mergeCells('A2:V2');
        const subtitleCell = worksheet.getCell('A2');

        let textoFiltros = `Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')} | ` +
            `Categoría: ${document.getElementById('filtroCategoria') && document.getElementById('filtroCategoria').value ? document.getElementById('filtroCategoria').value : 'Todas'} | ` +
            `Estatus: ${document.getElementById('filtroEstatus') && document.getElementById('filtroEstatus').value ? document.getElementById('filtroEstatus').value : 'Todos'} | ` +
            `Condición: ${document.getElementById('filtroCondicion') && document.getElementById('filtroCondicion').value ? document.getElementById('filtroCondicion').value : 'Todas'}`;
        if (busqueda) textoFiltros += ` | Búsqueda: "${busqueda}"`;
        if (fechaInicio || fechaFin) {
            const fInicioStr = fechaInicio ? new Date(fechaInicio + "T00:00:00").toLocaleDateString('es-MX') : 'Inicio';
            const fFinStr = fechaFin ? new Date(fechaFin + "T00:00:00").toLocaleDateString('es-MX') : 'Fin';
            textoFiltros += ` | Rango: ${fInicioStr} a ${fFinStr}`;
        }
        textoFiltros += ` | Cantidad: ${resultadosFiltrados.length}`;

        subtitleCell.value = textoFiltros;
        subtitleCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF333333' } };
        subtitleCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF1F5F9' } // Gris claro
        };
        subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 25;

        worksheet.getRow(3).height = 15;

        const esProcesoExport = (estatusFiltro === 'proceso');

        const headers = [
            "Serie", "Categoría", "Condición", "Marca", "Modelo", "Procesador",
            "Generación", "Velocidad", "RAM", "Tipo RAM", "HDD", "SSD", "Pantalla", "Sistema Operativo", "Estatus",
            "Cliente",
            esProcesoExport ? "Abonos" : "Precio U. Final",
            esProcesoExport ? "Saldo Restante" : "Precio Mayorista",
            esProcesoExport ? "Fecha Abono" : "Fecha de Pago",
            "Fecha de Entrega", "Estética", "Comentarios"
        ];

        const headerRow = worksheet.getRow(4);
        headerRow.values = headers;
        headerRow.height = 25;

        headerRow.eachCell((cell) => {
            cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC71010' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF990000' } },
                bottom: { style: 'medium', color: { argb: 'FF550000' } },
                left: { style: 'thin', color: { argb: 'FF990000' } },
                right: { style: 'thin', color: { argb: 'FF990000' } }
            };
        });

        const startRowIndex = 5;
        let currentRowIndex = startRowIndex;

        const statusStyles = {
            'almacén': { bg: 'FFE2F0D9', fg: 'FF385723' },       // Verde suave
            'almacen': { bg: 'FFE2F0D9', fg: 'FF385723' },       // Verde suave
            'vendido': { bg: 'FFC9DAF8', fg: 'FF1C4587' },       // Azul suave
            'proceso': { bg: 'FFFFF2CC', fg: 'FF7F6000' },       // Amarillo suave
            'en garantía': { bg: 'FFFCE4D6', fg: 'FFC65911' },   // Naranja suave
            'en garantia': { bg: 'FFFCE4D6', fg: 'FFC65911' },   // Naranja suave
            'por habilitar': { bg: 'FFE1D5E7', fg: 'FF5A367E' }, // Púrpura suave
            'falta pza': { bg: 'FFF8CECC', fg: 'FFB85450' }      // Rojo suave
        };

        resultadosFiltrados.forEach((d) => {
            let valPrecioFinal = Number(d.precioPublico) || 0;
            let valPrecioMayorista = Number(d.precioMayorista) || 0;
            let valFechaPago = d.fechaPago || "";

            if (esProcesoExport) {
                const historial = d.historialAbonos || [];
                const abonado = historial.reduce((sum, item) => sum + Number(item.monto), 0);
                const tipoPrecio = d.tipoPrecioAbono || 'publico';
                const precioTotal = tipoPrecio === 'publico' ? valPrecioFinal : valPrecioMayorista;
                const saldo = precioTotal - abonado;

                valPrecioFinal = abonado;
                valPrecioMayorista = saldo;

                if (historial.length > 0) {
                    const ultimoAbono = historial[historial.length - 1];
                    if (ultimoAbono.fecha) {
                        valFechaPago = ultimoAbono.fecha;
                    }
                }
            }

            const rowValues = [
                d.serie || "",
                d.categoria || "",
                d.condicion || "",
                d.marca || "",
                d.modelo || "",
                d.procesador || "",
                d.generacion || "",
                d.velocidad ? `${d.velocidad} Ghz` : "",
                d.ram || "",
                d.tipoRam || "",
                d.hdd || "",
                d.ssd || "",
                d.pantalla || "",
                d.os || "",
                d.estatus || "",
                d.cliente || "",
                valPrecioFinal,
                valPrecioMayorista,
                valFechaPago,
                d.fechaEntrega || "",
                d.estetica || "",
                d.comentarios || ""
            ];

            const dataRow = worksheet.getRow(currentRowIndex);
            dataRow.values = rowValues;
            dataRow.height = 22

            const isEven = (currentRowIndex % 2 === 0);
            const rowBgColor = isEven ? 'FFF9FAFB' : 'FFFFFFFF';

            dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.font = { name: 'Segoe UI', size: 9.5, color: { argb: 'FF333333' } };

                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: rowBgColor }
                };

                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };

                if ([1, 2, 8, 9, 10, 11, 12, 13, 18, 19].includes(colNumber)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else if ([3, 4, 15].includes(colNumber)) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }

                if (colNumber === 15) {
                    const estValue = String(cell.value || '').trim().toLowerCase();
                    const styleMatch = statusStyles[estValue];
                    if (styleMatch) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: styleMatch.bg }
                        };
                        cell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: styleMatch.fg } };
                    }
                }

                if (colNumber === 4) {
                    cell.font = { name: 'Segoe UI', size: 9.5, bold: true };
                }

                if (colNumber === 17 || colNumber === 18) {
                    cell.numFmt = '$#,##0.00';
                    cell.alignment = { vertical: 'middle', horizontal: 'right' };
                }
            });

            currentRowIndex++;
        });

        worksheet.mergeCells(currentRowIndex, 1, currentRowIndex, 16);
        const labelCell = worksheet.getCell(currentRowIndex, 1);
        labelCell.value = "TOTALES";
        labelCell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF333333' } };
        labelCell.alignment = { vertical: 'middle', horizontal: 'right' };

        let totalCol17 = 0;
        let totalCol18 = 0;
        if (esProcesoExport) {
            resultadosFiltrados.forEach(curr => {
                const historial = curr.historialAbonos || [];
                const abonado = historial.reduce((sum, item) => sum + Number(item.monto), 0);
                const tipoPrecio = curr.tipoPrecioAbono || 'publico';
                const precioTotal = tipoPrecio === 'publico' ? (Number(curr.precioPublico) || 0) : (Number(curr.precioMayorista) || 0);
                const saldo = precioTotal - abonado;
                totalCol17 += abonado;
                totalCol18 += saldo;
            });
        } else {
            totalCol17 = resultadosFiltrados.reduce((acc, curr) => acc + (Number(curr.precioPublico) || 0), 0);
            totalCol18 = resultadosFiltrados.reduce((acc, curr) => acc + (Number(curr.precioMayorista) || 0), 0);
        }

        const cellPublico = worksheet.getCell(currentRowIndex, 17);
        cellPublico.value = {
            formula: `SUM(Q5:Q${currentRowIndex - 1})`,
            result: totalCol17
        };
        cellPublico.numFmt = '$#,##0.00';
        cellPublico.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF333333' } };
        cellPublico.alignment = { vertical: 'middle', horizontal: 'right' };

        const cellMayorista = worksheet.getCell(currentRowIndex, 18);
        cellMayorista.value = {
            formula: `SUM(R5:R${currentRowIndex - 1})`,
            result: totalCol18
        };
        cellMayorista.numFmt = '$#,##0.00';
        cellMayorista.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF333333' } };
        cellMayorista.alignment = { vertical: 'middle', horizontal: 'right' };

        const totalsRow = worksheet.getRow(currentRowIndex);
        totalsRow.height = 25;

        for (let colIdx = 1; colIdx <= 22; colIdx++) {
            const cell = worksheet.getCell(currentRowIndex, colIdx);
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF1F5F9' }
            };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF94A3B8' } },
                bottom: { style: 'double', color: { argb: 'FF475569' } },
                left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
        }

        worksheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: false }, (cell) => {
                if (cell.row === 1 || cell.row === 2) return;

                const cellLength = cell.value ? String(cell.value).length : 0;
                if (cellLength > maxLength) {
                    maxLength = cellLength;
                }
            });
            column.width = Math.max(maxLength + 4, 12);
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `Reporte_Almacen_Proseinet_${dateStr}.xlsx`;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        modalLoading.hide();
    } catch (error) {
        console.error("Error al exportar a Excel: ", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al generar el archivo Excel.",
            icon: "error"
        });
        modalLoading.hide();
    }
}

const btnExportarExcel = document.getElementById('btnExportarExcel');
if (btnExportarExcel) {
    btnExportarExcel.addEventListener('click', exportarAEXCEL);
}

window.verDetalles = async (serie) => {
    const docRef = doc(db, 'almacen', serie);
    const snap = await getDoc(docRef);

    if (!snap.exists()) return;
    const d = snap.data();

    let fechaEntrega = formatearFechaEstricta(d.fechaEntrega, true);
    let fechaPago = formatearFechaEstricta(d.fechaPago, true);
    let etiquetaPagoFicha = 'Pago:';

    const estMinD = String(d.estatus || '').toLowerCase();
    if (estMinD === 'proceso' || estMinD === 'en garantía' || estMinD === 'en garantia') {
        const historial = d.historialAbonos || [];
        if (historial.length > 0) {
            const ultimoAbono = historial[historial.length - 1];
            if (ultimoAbono.fecha) {
                fechaPago = formatearFechaEstricta(ultimoAbono.fecha, true);
            }
        }
        etiquetaPagoFicha = 'Abono:';
    }

    let fechaMovi = formatearFechaEstricta(d.fechaMovimiento, true);

    let htmlGarantiasLogistica = '';
    const historialGarantias = d.historialGarantias || [];
    if (historialGarantias.length > 0) {
        const renderItem = h => {
            const fechaEnt = formatearFechaEstricta(h.fechaEntrada, true);
            const fechaSal = h.fechaSalida ? formatearFechaEstricta(h.fechaSalida, true) : 'Activa actualmente';
            return `<div style="font-size: 0.85rem; line-height: 1.2; margin-bottom: 4px;">
                        <i class="bi bi-calendar-check text-muted me-1"></i> ${fechaEnt} al ${fechaSal}
                    </div>`;
        };

        const primerosCinco = historialGarantias.slice(0, 5).map(renderItem).join('');
        const restantes = historialGarantias.length > 5
            ? historialGarantias.slice(5).map(renderItem).join('')
            : '';

        htmlGarantiasLogistica = `
        <div class="mt-2 pt-2 border-top">
            <p class="mb-1" style="font-size: 0.95rem;"><strong>Garantías anteriores:</strong></p>
            <div class="text-secondary small">
                ${primerosCinco}
                ${historialGarantias.length > 5 ? `
                <div class="d-none mt-1">
                    ${restantes}
                </div>
                <span class="text-primary small fw-semibold d-inline-block mt-1" style="cursor: pointer; text-decoration: underline;" onclick="const target = this.previousElementSibling; target.classList.toggle('d-none'); this.textContent = target.classList.contains('d-none') ? 'Ver más (+${historialGarantias.length - 5})' : 'Ver menos';">
                    Ver más (+${historialGarantias.length - 5})
                </span>
                ` : ''}
            </div>
        </div>
        `;
    }

    let badgeEstatus = 'bg-primary';
    const estMin = String(d.estatus || '').toLowerCase();
    if (estMin === 'vendido') badgeEstatus = 'bg-primary';
    if (estMin === 'proceso') badgeEstatus = 'bg-proceso';
    if (estMin === 'almacén' || estMin === 'almacen') badgeEstatus = 'bg-success';
    if (estMin === 'en garantía' || estMin === 'en garantia') badgeEstatus = 'bg-garantia';
    if (estMin === 'por habilitar') badgeEstatus = 'bg-habilitar text-white';
    if (estMin === 'falta pza') badgeEstatus = 'bg-danger';

    const totalAbonadoCalc = d.historialAbonos
        ? d.historialAbonos.reduce((sum, item) => sum + Number(item.monto || 0), 0)
        : Number(d.totalAbonado || 0);

    const tipoPrecioGuardado = d.tipoPrecioAbono || 'publico';
    const precioBase = tipoPrecioGuardado === 'publico' ? Number(d.precioPublico || 0) : Number(d.precioMayorista || 0);
    const saldoRestanteCalc = precioBase - totalAbonadoCalc;

    const contenedor = document.getElementById('detalleContenido');
    if (d.estatus === 'Vendido') {
        contenedor.innerHTML = `
        <div class="col-md-4">
            <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #0369a1 !important; border-radius: 12px;">
                <div class="card-body p-4">
                    <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-box-open text-primary me-2"></i>Logística</h6>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Lote:</strong> <span class="text-secondary">${d.nLot || 'N/A'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Serie:</strong> <span class="font-monospace fw-bold text-dark">${d.serie}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Estatus:</strong> <span class="badge ${badgeEstatus} rounded-pill px-3">${d.estatus}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Condición:</strong> <span class="badge bg-light text-dark border rounded-pill">${d.condicion}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Cliente:</strong> <span class="text-secondary">${d.cliente || 'Sin asignar'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Entrega:</strong> <span class="text-secondary"><i class="bi bi-calendar-check me-1"></i>${fechaEntrega}</span></p>
                    <p class="mb-0" style="font-size: 0.95rem;"><strong>${etiquetaPagoFicha}</strong> <span class="text-secondary"><i class="bi bi-cash me-1"></i>${fechaPago}</span></p>
                    ${htmlGarantiasLogistica}
                    <hr>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="small text-muted">Abonado:</span>
                        <span class="small text-success">Pagado Completamente</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #da621d !important; border-radius: 12px;">
                <div class="card-body p-4">
                    <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-microchip text-warning me-2"></i>Especificaciones</h6>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Equipo:</strong> <span class="text-dark fw-medium">${d.marca} ${d.modelo}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Procesador:</strong> <span class="text-secondary">${d.procesador} ${d.generacion || ''}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Gráficos:</strong> <span class="text-secondary">${d.descVideo || 'Integrados'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>RAM:</strong> <span class="text-secondary">${d.ram} ${d.tipoRam || ''}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Almacenamiento:</strong> <span class="text-secondary">SSD: ${d.ssd || 'No'} | HDD: ${d.hdd || 'No'}</span></p>
                    
                    <div class="mt-3 pt-3 border-top">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="small text-muted">Precio Mayorista:</span>
                            <span class="fw-bold text-success" style="font-size: 1.1rem;">$${Number(d.precioMayorista || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="small text-muted">Precio Público:</span>
                            <span class="fw-bold text-dark" style="font-size: 1.1rem;">$${Number(d.precioPublico || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #15803d !important; border-radius: 12px;">
                <div class="card-body p-4">
                    <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-laptop text-success me-2"></i>Sistema y Estética</h6>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Sistema Operativo:</strong> <span class="text-secondary">${d.os || 'N/A'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Licencia:</strong> <span class="text-secondary">${d.licencia || 'N/A'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Color:</strong> <span class="text-secondary">${d.color || 'N/A'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Pantalla:</strong> <span class="text-secondary">${d.pantalla || 'N/A'}</span></p>
                    <p class="mb-2" style="font-size: 0.95rem;"><strong>Estética:</strong> <span class="text-secondary">${d.estetica || 'Ninguna'}</span></p>
                    <div class="mt-2">
                        <strong style="font-size: 0.95rem;">Observaciones:</strong>
                        <div class="mt-1 bg-light p-2 rounded text-muted small" style="max-height: 70px; overflow-y: auto; border: 1px solid #e2e8f0;">
                            ${d.comentarios || 'Ninguna observación.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    } else if (d.estatus === 'En garantía' || d.estatus === 'En garantia') {
        contenedor.innerHTML = `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #0369a1 !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-box-open text-primary me-2"></i>Logística</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Lote:</strong> <span class="text-secondary">${d.nLot || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Serie:</strong> <span class="font-monospace fw-bold text-dark">${d.serie}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estatus:</strong> <span class="badge ${badgeEstatus} rounded-pill px-3">${d.estatus}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Condición:</strong> <span class="badge bg-light text-dark border rounded-pill">${d.condicion}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Cliente:</strong> <span class="text-secondary">${d.cliente || 'Sin asignar'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Entrega:</strong> <span class="text-secondary"><i class="bi bi-calendar-check me-1"></i>${fechaEntrega}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>${etiquetaPagoFicha}</strong> <span class="text-secondary"><i class="bi bi-cash me-1"></i>${fechaPago}</span></p>
                        ${htmlGarantiasLogistica}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #da621d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-microchip text-warning me-2"></i>Especificaciones</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Equipo:</strong> <span class="text-dark fw-medium">${d.marca} ${d.modelo}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Procesador:</strong> <span class="text-secondary">${d.procesador} ${d.generacion || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Gráficos:</strong> <span class="text-secondary">${d.descVideo || 'Integrados'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>RAM:</strong> <span class="text-secondary">${d.ram} ${d.tipoRam || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Almacenamiento:</strong> <span class="text-secondary">SSD: ${d.ssd || 'No'} | HDD: ${d.hdd || 'No'}</span></p>
                        
                        <div class="mt-3 pt-3 border-top">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="small text-muted">Precio Mayorista:</span>
                                <span class="fw-bold text-success" style="font-size: 1.1rem;">$${Number(d.precioMayorista || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Precio Público:</span>
                                <span class="fw-bold text-dark" style="font-size: 1.1rem;">$${Number(d.precioPublico || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Abonado:</span>
                                <span class="fw-bold text-success" style="font-size: 1.1rem;">$${totalAbonadoCalc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Saldo Restante:</span>
                                <span class="fw-bold text-danger" style="font-size: 1.1rem;">$${saldoRestanteCalc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #15803d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-laptop text-success me-2"></i>Sistema y Estética</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Sistema Operativo:</strong> <span class="text-secondary">${d.os || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Licencia:</strong> <span class="text-secondary">${d.licencia || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Color:</strong> <span class="text-secondary">${d.color || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Pantalla:</strong> <span class="text-secondary">${d.pantalla || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estética:</strong> <span class="text-secondary">${d.estetica || 'Ninguna'}</span></p>
                        <div class="mt-2">
                            <strong style="font-size: 0.95rem;">Observaciones:</strong>
                            <div class="mt-1 bg-light p-2 rounded text-muted small" style="max-height: 70px; overflow-y: auto; border: 1px solid #e2e8f0;">
                                ${d.comentarios || 'Ninguna observación.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (d.estatus === 'Almacen' || d.estatus === 'Almacén') {
        contenedor.innerHTML = `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #0369a1 !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-box-open text-primary me-2"></i>Logística</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Lote:</strong> <span class="text-secondary">${d.nLot || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Serie:</strong> <span class="font-monospace fw-bold text-dark">${d.serie}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estatus:</strong> <span class="badge ${badgeEstatus} rounded-pill px-3">${d.estatus}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Condición:</strong> <span class="badge bg-light text-dark border rounded-pill">${d.condicion}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Cliente:</strong> <span class="text-secondary">${d.cliente || 'Sin asignar'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Entrega:</strong> <span class="text-secondary"><i class="bi bi-calendar-check me-1"></i>${fechaEntrega}</span></p>
                        <p class="mb-0" style="font-size: 0.95rem;"><strong>${etiquetaPagoFicha}</strong> <span class="text-secondary"><i class="bi bi-cash me-1"></i>${fechaPago}</span></p>
                        ${htmlGarantiasLogistica}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #da621d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-microchip text-warning me-2"></i>Especificaciones</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Equipo:</strong> <span class="text-dark fw-medium">${d.marca} ${d.modelo}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Procesador:</strong> <span class="text-secondary">${d.procesador} ${d.generacion || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Gráficos:</strong> <span class="text-secondary">${d.descVideo || 'Integrados'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>RAM:</strong> <span class="text-secondary">${d.ram} ${d.tipoRam || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Almacenamiento:</strong> <span class="text-secondary">SSD: ${d.ssd || 'No'} | HDD: ${d.hdd || 'No'}</span></p>
                        
                        <div class="mt-3 pt-3 border-top">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="small text-muted">Precio Mayorista:</span>
                                <span class="fw-bold text-success" style="font-size: 1.1rem;">$${Number(d.precioMayorista || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Precio Público:</span>
                                <span class="fw-bold text-dark" style="font-size: 1.1rem;">$${Number(d.precioPublico || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #15803d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-laptop text-success me-2"></i>Sistema y Estética</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Sistema Operativo:</strong> <span class="text-secondary">${d.os || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Licencia:</strong> <span class="text-secondary">${d.licencia || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Color:</strong> <span class="text-secondary">${d.color || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Pantalla:</strong> <span class="text-secondary">${d.pantalla || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estética:</strong> <span class="text-secondary">${d.estetica || 'Ninguna'}</span></p>
                        <div class="mt-2">
                            <strong style="font-size: 0.95rem;">Observaciones:</strong>
                            <div class="mt-1 bg-light p-2 rounded text-muted small" style="max-height: 70px; overflow-y: auto; border: 1px solid #e2e8f0;">
                                ${d.comentarios || 'Ninguna observación.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        contenedor.innerHTML = `
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #0369a1 !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-box-open text-primary me-2"></i>Logística</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Lote:</strong> <span class="text-secondary">${d.nLot || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Serie:</strong> <span class="font-monospace fw-bold text-dark">${d.serie}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estatus:</strong> <span class="badge ${badgeEstatus} rounded-pill px-3">${d.estatus}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Condición:</strong> <span class="badge bg-light text-dark border rounded-pill">${d.condicion}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Cliente:</strong> <span class="text-secondary">${d.cliente || 'Sin asignar'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Entrega:</strong> <span class="text-secondary"><i class="bi bi-calendar-check me-1"></i>${fechaEntrega}</span></p>
                        <p class="mb-0" style="font-size: 0.95rem;"><strong>${etiquetaPagoFicha}</strong> <span class="text-secondary"><i class="bi bi-cash me-1"></i>${fechaPago}</span></p>
                        ${htmlGarantiasLogistica}
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #da621d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-microchip text-warning me-2"></i>Especificaciones</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Equipo:</strong> <span class="text-dark fw-medium">${d.marca} ${d.modelo}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Procesador:</strong> <span class="text-secondary">${d.procesador} ${d.generacion || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Gráficos:</strong> <span class="text-secondary">${d.descVideo || 'Integrados'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>RAM:</strong> <span class="text-secondary">${d.ram} ${d.tipoRam || ''}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Almacenamiento:</strong> <span class="text-secondary">SSD: ${d.ssd || 'No'} | HDD: ${d.hdd || 'No'}</span></p>
                        
                        <div class="mt-3 pt-3 border-top">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="small text-muted">Precio Mayorista:</span>
                                <span class="fw-bold text-success" style="font-size: 1.1rem;">$${Number(d.precioMayorista || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Precio Público:</span>
                                <span class="fw-bold text-dark" style="font-size: 1.1rem;">$${Number(d.precioPublico || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <hr>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Abonado:</span>
                                <span class="fw-bold text-success" style="font-size: 1.1rem;">$${totalAbonadoCalc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="small text-muted">Saldo Restante:</span>
                                <span class="fw-bold text-danger" style="font-size: 1.1rem;">$${saldoRestanteCalc.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card h-100 shadow-sm bg-white" style="border: 1px solid #f1f5f9; border-left: 4px solid #15803d !important; border-radius: 12px;">
                    <div class="card-body p-4">
                        <h6 class="text-dark fw-bold border-bottom pb-2 mb-3"><i class="fa-solid fa-laptop text-success me-2"></i>Sistema y Estética</h6>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Sistema Operativo:</strong> <span class="text-secondary">${d.os || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Licencia:</strong> <span class="text-secondary">${d.licencia || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Color:</strong> <span class="text-secondary">${d.color || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Pantalla:</strong> <span class="text-secondary">${d.pantalla || 'N/A'}</span></p>
                        <p class="mb-2" style="font-size: 0.95rem;"><strong>Estética:</strong> <span class="text-secondary">${d.estetica || 'Ninguna'}</span></p>
                        <div class="mt-2">
                            <strong style="font-size: 0.95rem;">Observaciones:</strong>
                            <div class="mt-1 bg-light p-2 rounded text-muted small" style="max-height: 70px; overflow-y: auto; border: 1px solid #e2e8f0;">
                                ${d.comentarios || 'Ninguna observación.'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const modal = new bootstrap.Modal(document.getElementById('modalDetallesEquipo'));
    modal.show();
};

const btnExportarPDF = document.getElementById('btnExportarPDF');
const modalPDFLoading = new bootstrap.Modal(document.getElementById('modalPDFLoading'));
const modalCrearCotizacion = new bootstrap.Modal(document.getElementById('modalCrearCotizacion'));
const modalCrearCotizacionEl = document.getElementById('modalCrearCotizacion');
if (modalCrearCotizacionEl) {
    modalCrearCotizacionEl.addEventListener('hidden.bs.modal', () => {
        if (window.evitarResetModal) {
            window.evitarResetModal = false;
            return;
        }
        window.transaccionModoVender = false;
        window.equiposVentaPendientes = [];

        localStorage.removeItem('cotizacion_temporal');
        window.evitarAutoGuardadoCotizacion = false;

        const regFolioCoti = document.getElementById('regFolioCoti');
        if (regFolioCoti) {
            regFolioCoti.value = '';
            regFolioCoti.removeAttribute('data-folionum');
        }

        const regFechaCoti = document.getElementById('regFechaCoti');
        if (regFechaCoti) regFechaCoti.value = '';

        const fieldsToClear = [
            'regClienteCoti', 'regTelefonoCoti', 'regEmailCoti',
            'regTiempoEntrega', 'regMetodoPago', 'regCondicionesPago'
        ];
        fieldsToClear.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });

        const regTipoClienteCoti = document.getElementById('regTipoClienteCoti');
        if (regTipoClienteCoti) regTipoClienteCoti.value = "publico";

        const regVigenciaCoti = document.getElementById('regVigenciaCoti');
        if (regVigenciaCoti) regVigenciaCoti.value = "8-dias";

        const iva16 = document.getElementById('iva16');
        if (iva16) iva16.checked = true;

        const body = document.querySelector('#tablaItemsCoti tbody');
        if (body) {
            body.innerHTML = '';
        }

        modalCrearCotizacionEl.removeAttribute('data-modo');
        modalCrearCotizacionEl.removeAttribute('data-folio-original');
        modalCrearCotizacionEl.removeAttribute('data-folio-num-original');

        const tituloModal = document.querySelector('#modalCrearCotizacion .modal-title');
        if (tituloModal) {
            tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Crear Cotización`;
        }

        const btnGenerarPDFCotizacionFinal = document.getElementById('btnGenerarPDFCotizacionFinal');
        if (btnGenerarPDFCotizacionFinal) {
            btnGenerarPDFCotizacionFinal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>Exportar`;
        }

        const btnLimpiarCotizacion = document.getElementById('btnLimpiarCotizacion');
        if (btnLimpiarCotizacion) {
            btnLimpiarCotizacion.style.display = '';
        }

        if (window.ultimoOrigenModal === 'historial') {
            window.ultimoOrigenModal = null;
            setTimeout(() => {
                new bootstrap.Modal(document.getElementById('modalHistorialCotizaciones')).show();
            }, 300);
        }
    });
}
const modalCrearNotaVenta = new bootstrap.Modal(document.getElementById('modalCrearNotaVenta'));
const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
if (modalCrearNotaVentaEl) {
    modalCrearNotaVentaEl.addEventListener('hidden.bs.modal', () => {
        if (window.evitarResetModal) {
            window.evitarResetModal = false;
            return;
        }
        window.transaccionModoVender = false;
        window.equiposVentaPendientes = [];

        modalCrearNotaVentaEl.removeAttribute('data-modo');
        modalCrearNotaVentaEl.removeAttribute('data-tipo-nota');
        modalCrearNotaVentaEl.removeAttribute('data-folio-original');
        modalCrearNotaVentaEl.removeAttribute('data-folio-num-original');

        const tituloModal = document.getElementById('tituloModalNota');
        if (tituloModal) {
            tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Crear Nota de Venta`;
        }

        const lblTituloNotaEquipos = document.getElementById('lblTituloNotaEquipos');
        if (lblTituloNotaEquipos) {
            lblTituloNotaEquipos.innerText = 'Nota de Venta de Equipos o Servicios';
        }

        const btnGenerarPDFNotaFinal = document.getElementById('btnGenerarPDFNotaFinal');
        if (btnGenerarPDFNotaFinal) {
            btnGenerarPDFNotaFinal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>Exportar`;
        }

        if (window.ultimoOrigenModal === 'historial') {
            window.ultimoOrigenModal = null;
            setTimeout(() => {
                new bootstrap.Modal(document.getElementById('modalHistorialCotizaciones')).show();
            }, 300);
        }
    });
}
const modalVistaPreviaPDF = new bootstrap.Modal(document.getElementById('modalVistaPreviaPDF'));
let activePreviewBlobUrl = null;
const btnExportarCotizacion = document.getElementById('btnExportarCotizacion');
const btnExportarNota = document.getElementById('btnExportarNota');
const btnAgregarFilaCoti = document.getElementById('btnAgregarFilaCoti');
const btnAgregarFilaNota = document.getElementById('btnAgregarFilaNota');
const btnGenerarPDFCotizacionFinal = document.getElementById('btnGenerarPDFCotizacionFinal');
const btnLimpiarCotizacion = document.getElementById('btnLimpiarCotizacion');
const btnGenerarPDFNotaFinal = document.getElementById('btnGenerarPDFNotaFinal');
const btnVistaPreviaCotizacion = document.getElementById('btnVistaPreviaCotizacion');
const btnVistaPreviaNota = document.getElementById('btnVistaPreviaNota');
const tablaItemsCotiBody = document.querySelector('#tablaItemsCoti tbody');
const tablaItemsNotaBody = document.querySelector('#tablaItemsNota tbody');

const limpiarCotizacionForm = async () => {
    const result = await Swal.fire({
        title: '¿Limpiar formulario?',
        text: 'Se borrará toda la información y los productos agregados. Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, limpiar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
        window.evitarAutoGuardadoCotizacion = true;
        localStorage.removeItem('cotizacion_temporal');
        modalLoading.show();
        try {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snap = await getDocs(q);
            let nextFolioNum = 964;
            if (!snap.empty) {
                nextFolioNum = snap.docs[0].data().folioNum + 1;
            }

            document.getElementById('regFolioCoti').value = `PRO-${nextFolioNum}`;
            document.getElementById('regFolioCoti').setAttribute('data-folionum', nextFolioNum);

            const today = new Date().toISOString().split('T')[0];
            document.getElementById('regFechaCoti').value = today;
            document.getElementById('regClienteCoti').value = "";
            document.getElementById('regTelefonoCoti').value = "";
            document.getElementById('regEmailCoti').value = "";
            document.getElementById('regTipoClienteCoti').value = "publico";
            document.getElementById('regVigenciaCoti').value = "8-dias";
            document.getElementById('iva16').checked = true;
            document.getElementById('regFirmaCoti').innerHTML = "L.A.E Juan José Arreola Bucio&#10;Director General";

            tablaItemsCotiBody.innerHTML = '';
            agregarFilaCoti();

            modalLoading.hide();
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: 'El formulario se ha reiniciado correctamente.',
                showConfirmButton: false,
                timer: 2000
            });
        } catch (error) {
            modalLoading.hide();
            console.error("Error al obtener folio para limpiar:", error);
        }
    }
};

if (btnLimpiarCotizacion) {
    btnLimpiarCotizacion.addEventListener('click', limpiarCotizacionForm);
}

window.abrirCotizacionManual = async () => {
    window.ultimoOrigenModal = null;
    window.modoCotizacionManual = true;
    modalLoading.show();
    try {
        const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
        const snap = await getDocs(q);
        let nextFolioNum = 964;
        if (!snap.empty) {
            nextFolioNum = snap.docs[0].data().folioNum + 1;
        }

        document.getElementById('regFolioCoti').value = `PRO-${nextFolioNum}`;
        document.getElementById('regFolioCoti').setAttribute('data-folionum', nextFolioNum);

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('regFechaCoti').value = today;
        document.getElementById('regClienteCoti').value = "";
        document.getElementById('regTelefonoCoti').value = "";
        document.getElementById('regEmailCoti').value = "";
        document.getElementById('regTipoClienteCoti').value = "publico";
        document.getElementById('regMensajeCoti').value = "*La garantía aplica exclusivamente sobre fallas de hardware atribuibles al funcionamiento propio del equipo, excluyendo daños ocasionados por mal uso, variaciones eléctricas, humedad, golpes, manipulación no autorizada o instalación de componentes ajenos. *Debido a la naturaleza consumible y al desgaste inherente de las baterías, no es posible garantizar su capacidad, autonomía, duración o vida útil remanente, por lo que dichos componentes quedan expresamente excluidos de cualquier cobertura de garantía";
        document.getElementById('iva0').checked = true;
        document.getElementById('regMetodoPago').value = "Por Definir";
        document.getElementById('regCondicionesPago').value = "";
        document.getElementById('regTiempoEntrega').value = "";
        document.getElementById('regVigenciaCoti').value = "8-dias";
        document.getElementById('regFirmaCoti').innerHTML = "L.A.E Juan José Arreola Bucio&#10;Director General";


        tablaItemsCotiBody.innerHTML = '';
        agregarFilaCoti();

        modalLoading.hide();
        modalCrearCotizacion.show();
    } catch (error) {
        modalLoading.hide();
        console.error("Error obteniendo secuencia de folio:", error);
    }
};

function agregarFilaCoti(clave = '', desc = '', costo = '', cant = '1', precioMayorista = '', precioPublico = '', key = '') {
    if (clave && typeof clave === 'object' && clave.preventDefault) {
        clave = '';
    }
    const tr = document.createElement('tr');
    tr.setAttribute('data-precio-mayorista', precioMayorista !== undefined && precioMayorista !== null && precioMayorista !== '' ? precioMayorista : 0);
    tr.setAttribute('data-precio-publico', precioPublico !== undefined && precioPublico !== null && precioPublico !== '' ? precioPublico : 0);
    if (key) tr.setAttribute('data-key', key);
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm coti-clave" placeholder="CODM..." value="${clave || 'CODM'}"></td>
        <td><textarea class="form-control form-control-sm coti-desc" rows="3" placeholder="Descripción...">${desc}</textarea></td>
        <td><input type="number" class="form-control form-control-sm coti-costo" step="0.01" placeholder="0.00" value="${costo}"></td>
        <td><input type="number" class="form-control form-control-sm coti-cant" value="${cant}"></td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger border-0 btn-eliminar-fila"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tablaItemsCotiBody.appendChild(tr);
    tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
}

if (btnAgregarFilaCoti) {
    btnAgregarFilaCoti.addEventListener('click', agregarCotiFilaWrapper => agregarFilaCoti());
}

const btnBuscarModeloCoti = document.getElementById('btnBuscarModeloCoti');
if (btnBuscarModeloCoti) {
    btnBuscarModeloCoti.addEventListener('click', () => {
        window.contextoClonacion = 'coti';
        window.evitarResetModal = true;
        const modalEl = document.getElementById('modalCrearCotizacion');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        setTimeout(() => {
            const inputBuscador = document.getElementById('buscadorClonar');
            const selectCat = document.getElementById('filtroCategoriaClonar');
            if (inputBuscador) inputBuscador.value = '';
            if (selectCat) selectCat.value = '';
            const tituloClonar = document.querySelector('#modalClonarEquipo .modal-title');
            if (tituloClonar) {
                tituloClonar.innerHTML = `<div class="modal-icon-badge primary"><i class="fa-solid fa-search"></i></div> Buscar Equipos Disponibles`;
            }
            if (!modalClonarEquipoInst) modalClonarEquipoInst = new bootstrap.Modal(document.getElementById('modalClonarEquipo'));
            modalClonarEquipoInst.show();
            renderTablaClonar();
        }, 150);
    });
}

function agregarFilaNota(clave = '', desc = '', costo = '', cant = '1', precioMayorista = '', precioPublico = '', key = '') {
    if (clave && typeof clave === 'object' && clave.preventDefault) {
        clave = '';
    }
    const tr = document.createElement('tr');
    tr.setAttribute('data-precio-mayorista', precioMayorista !== undefined && precioMayorista !== null && precioMayorista !== '' ? precioMayorista : 0);
    tr.setAttribute('data-precio-publico', precioPublico !== undefined && precioPublico !== null && precioPublico !== '' ? precioPublico : 0);
    if (key) tr.setAttribute('data-key', key);
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm coti-clave" placeholder="CODM..." value="${clave || 'CODM'}"></td>
        <td><textarea class="form-control form-control-sm coti-desc" rows="3" placeholder="Descripción...">${desc}</textarea></td>
        <td><input type="number" class="form-control form-control-sm coti-costo" step="0.01" placeholder="0.00" value="${costo}"></td>
        <td><input type="number" class="form-control form-control-sm coti-cant" value="${cant}"></td>
        <td class="text-center"><button type="button" class="btn btn-sm btn-outline-danger border-0 btn-eliminar-fila"><i class="fa-solid fa-trash"></i></button></td>
    `;
    if (tablaItemsNotaBody) {
        tablaItemsNotaBody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
    }
}

if (btnAgregarFilaNota) {
    btnAgregarFilaNota.addEventListener('click', agregarNotaFilaWrapper => agregarFilaNota());
}

const btnBuscarModeloNota = document.getElementById('btnBuscarModeloNota');
if (btnBuscarModeloNota) {
    btnBuscarModeloNota.addEventListener('click', () => {
        window.contextoClonacion = 'nota';
        window.evitarResetModal = true;
        const modalEl = document.getElementById('modalCrearNotaVenta');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        setTimeout(() => {
            const inputBuscador = document.getElementById('buscadorClonar');
            const selectCat = document.getElementById('filtroCategoriaClonar');
            if (inputBuscador) inputBuscador.value = '';
            if (selectCat) selectCat.value = '';
            const tituloClonar = document.querySelector('#modalClonarEquipo .modal-title');
            if (tituloClonar) {
                tituloClonar.innerHTML = `<div class="modal-icon-badge primary"><i class="fa-solid fa-search"></i></div> Buscar Equipos Disponibles`;
            }
            if (!modalClonarEquipoInst) modalClonarEquipoInst = new bootstrap.Modal(document.getElementById('modalClonarEquipo'));
            modalClonarEquipoInst.show();
            renderTablaClonar();
        }, 150);
    });
}

if (btnExportarNota) {
    btnExportarNota.addEventListener('click', async () => {
        try {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snap = await getDocs(q);
            let nextFolioNum = 964;
            if (!snap.empty) {
                nextFolioNum = snap.docs[0].data().folioNum + 1;
            }

            document.getElementById('regFolioNota').value = `PRO-${nextFolioNum}`;
            document.getElementById('regFolioNota').setAttribute('data-folionum', nextFolioNum);

            const today = new Date().toISOString().split('T')[0];
            document.getElementById('regFechaNota').value = today;
            document.getElementById('regClienteNota').value = "";
            document.getElementById('regTelefonoNota').value = "";
            document.getElementById('regEmailNota').value = "";
            document.getElementById('regTipoClienteNota').value = "publico";
            document.getElementById('iva0Nota').checked = true;

            tablaItemsNotaBody.innerHTML = '';
            agregarFilaNota();

            modalCrearNotaVenta.show();
        } catch (error) {
            console.error("Error obteniendo secuencia de folio:", error);
        }
    });
}

const generarPDFCotizacionObjeto = async () => {
    const cliente = document.getElementById('regClienteCoti').value.trim();
    const telefono = document.getElementById('regTelefonoCoti').value.trim();
    const email = document.getElementById('regEmailCoti').value.trim();

    const fechaInput = document.getElementById('regFechaCoti').value;
    const fechaFormateada = fechaInput ? new Date(fechaInput + "T00:00:00").toLocaleDateString('es-MX') : "";
    const folio = document.getElementById('regFolioCoti').value.trim();

    const filas = document.querySelectorAll('#tablaItemsCoti tbody tr');
    const bodyPDF = [];
    const itemsToSave = [];
    let subtotalGlobal = 0;
    let iterador = 1;

    filas.forEach(fila => {
        const clave = fila.querySelector('.coti-clave').value.trim();
        const desc = fila.querySelector('.coti-desc').value.trim();
        const costo = parseFloat(fila.querySelector('.coti-costo').value) || 0;
        const cant = parseInt(fila.querySelector('.coti-cant').value) || 0;

        if (desc !== "" || clave !== "") {
            const importeFila = costo * cant;
            subtotalGlobal += importeFila;

            const precioMayorista = parseFloat(fila.getAttribute('data-precio-mayorista')) || 0;
            const precioPublico = parseFloat(fila.getAttribute('data-precio-publico')) || 0;
            itemsToSave.push({ clave, desc, costo, cant, precioMayorista, precioPublico });

            bodyPDF.push([
                iterador,
                clave,
                desc,
                `$${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                cant,
                `$${importeFila.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
            ]);
            iterador++;
        }
    });

    if (bodyPDF.length === 0) {
        await Swal.fire({
            title: "Falta Información",
            text: "Agrega al menos un equipo a la cotización",
            icon: "warning"
        });
        return null;
    }

    const tasaIvaSeleccionada = document.querySelector('input[name="tasaIvaCoti"]:checked').value;
    const multiplicadorIva = parseFloat(tasaIvaSeleccionada) / 100;

    const ivaGlobal = subtotalGlobal * multiplicadorIva;
    const totalGlobal = subtotalGlobal + ivaGlobal;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const logo = new Image();
    logo.src = '../img/PROSEINET-LOGO-PDFs.png';
    const logoPromise = new Promise((resolve) => {
        logo.onload = () => resolve(true);
        logo.onerror = () => resolve(false);
    });

    const logoRedes = new Image();
    logoRedes.src = '/img/redes-pdf.png';
    const logoRedesPromise = new Promise((resolve) => {
        logoRedes.onload = () => resolve(true);
        logoRedes.onerror = () => resolve(false);
    });

    await Promise.all([logoPromise, logoRedesPromise]);

    const emisorSeleccionado = document.getElementById('regEmisorCoti').value;
    const pagesDrawn = new Set();

    const drawHeaderAndFooter = (pageNum) => {
        if (pagesDrawn.has(pageNum)) return;
        pagesDrawn.add(pageNum);

        pdf.setFillColor(0, 0, 0);
        pdf.rect(10, 10, 90, 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Fecha:", 28, 14, { align: "right" });
        pdf.text("Cotización:", 28, 19, { align: "right" });
        pdf.text(fechaFormateada, 48, 14, { align: "right" });
        pdf.text(folio, 48, 19, { align: "right" });

        if (emisorSeleccionado === 'proseinet') {
            pdf.setFillColor(160, 20, 20);
            pdf.rect(10, 22, 90, 20, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("PROSEINET S.A.S. de C.V.", 12, 30);
            pdf.setFontSize(10);
            pdf.text("RFC: PRO1811056Y6", 12, 34);
        } else {
            pdf.setFillColor(120, 72, 150);
            pdf.rect(10, 22, 90, 20, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("Juan José Arreola Bucio", 12, 30);
            pdf.setFontSize(10);
            pdf.text("RFC: AEBJ88090977A", 12, 34);
        }

        if (logo.complete && logo.naturalWidth !== 0) {
            pdf.addImage(logo, 'PNG', 135, -6, 60, 64, undefined, 'FAST');
        }

        const pageHeight = pdf.internal.pageSize.getHeight();
        const footerY = pageHeight - 20;

        pdf.setFillColor(20, 20, 20);
        pdf.rect(10, footerY, 196, 15, 'F');

        if (emisorSeleccionado === 'proseinet') {
            pdf.setFillColor(160, 20, 20);
            pdf.rect(10, footerY - 5, 50, 5, 'F');
        } else {
            pdf.setFillColor(120, 72, 150);
            pdf.rect(10, footerY - 5, 50, 5, 'F');
        }

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("https://proseinet.mx/", 12, footerY - 1.5);

        pdf.setFillColor(110, 110, 110);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Gral. Pedro María Anaya #235 Int. 5, Col. Chapultepec Nte. c.p 58260 Morelia, Mich.", 12, footerY + 4.5);
        pdf.text("Tel: 443 684 3852, 443 273 1724, Correo: proseinet.sas@gmail.com", 12, footerY + 8);

        if (logoRedes.complete && logoRedes.naturalWidth !== 0) {
            pdf.addImage(logoRedes, 'PNG', 135, footerY - 2.5, 60, 20, undefined, 'FAST');
        }
    };

    pdf.autoTable({
        startY: 45,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        body: [
            ['Cliente', cliente],
            ['Teléfono', telefono],
            ['e-mail', email],
            [{ content: 'COTIZACIÓN DE EQUIPOS O SERVICIOS', colSpan: 2, styles: { fillColor: [220, 220, 220], halign: 'center' } }]
        ],
        columnStyles: {
            0: { cellWidth: 35, fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
            1: { cellWidth: 'auto', fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        },
        styles: { fontSize: 9, cellPadding: 1.5, lineColor: [100, 100, 100], lineWidth: 0.1 },
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        head: [['Item', 'Clave', 'Descripción', 'Cost. U', 'Cantidad', 'Importe']],
        body: bodyPDF,
        headStyles: { fillColor: [150, 150, 150], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', valign: 'middle', fillColor: [230, 230, 230], fontStyle: 'bold' },
            1: { cellWidth: 22, halign: 'center', valign: 'middle' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] },
            4: { cellWidth: 16, halign: 'center', valign: 'middle', fillColor: [240, 240, 240] },
            5: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] }
        },
        styles: { fontSize: 8, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1, textColor: [0, 0, 0] },
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY,
        margin: { top: 55, bottom: 28, left: 137.9, right: 10 },
        theme: 'grid',
        body: [
            ['Subtotal', `$${subtotalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
            [`IVA (${tasaIvaSeleccionada}%)`, `$${ivaGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
            ['Total', `$${totalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`]
        ],
        columnStyles: {
            0: { cellWidth: 42, fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0] },
            1: { cellWidth: 26, fillColor: [20, 20, 20], fontStyle: 'bold', halign: 'left', textColor: [255, 255, 255] }
        },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1 },
        pageBreak: 'avoid',
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    let currentY = pdf.lastAutoTable.finalY + 5;
    pdf.setFont("helvetica", 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);

    const entrega = document.getElementById('regTiempoEntrega').value;
    const metodoPago = document.getElementById('regMetodoPago').value;
    const pago = document.getElementById('regCondicionesPago').value;
    const vigenciaSelectValue = document.getElementById('regVigenciaCoti').value;

    const calcularVigenciaCotizacion = (fechaEmisionStr, vigenciaVal) => {
        if (!fechaEmisionStr) return vigenciaVal;
        const fecha = new Date(fechaEmisionStr + "T00:00:00");
        if (isNaN(fecha.getTime())) return vigenciaVal;

        let dias = 0;
        if (vigenciaVal === '8-dias') dias = 8;
        else if (vigenciaVal === '10-dias') dias = 10;
        else if (vigenciaVal === '15-dias') dias = 15;
        else if (vigenciaVal === '30-dias') dias = 30;
        else if (vigenciaVal === '1-semana') dias = 7;
        else if (vigenciaVal === '2-semanas') dias = 14;
        else if (vigenciaVal === '3-semanas') dias = 21;
        else if (vigenciaVal === '4-semanas') dias = 28;

        if (dias === 0) return vigenciaVal;

        fecha.setDate(fecha.getDate() + dias);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const vigencia = calcularVigenciaCotizacion(fechaInput, vigenciaSelectValue);

    pdf.autoTable({
        startY: currentY,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        body: [
            [{ content: 'Tiempo de entrega', fontStyle: 'bold' }, entrega],
            [{ content: 'Método de Pago', fontStyle: 'bold' }, metodoPago],
            [{ content: 'Condiciones de Pago', fontStyle: 'bold' }, pago],
            [{ content: 'Vigencia de la Cotización', fontStyle: 'bold' }, vigencia],
            [{
                content: tasaIvaSeleccionada === '0'
                    ? '*Esta cotización no cuenta con IVA'
                    : `*Esta cotización incluye IVA (${tasaIvaSeleccionada}%)`,
                colSpan: 2,
                fontStyle: 'italic',
                textColor: [80, 80, 80]
            }],
            [{ content: 'Atentamente:\n\n' + document.getElementById('regFirmaCoti').value, colSpan: 2, halign: 'center', fontStyle: 'bold' }]
        ],
        columnStyles: {
            0: { cellWidth: 50, fillColor: [240, 240, 240] },
            1: { cellWidth: 'auto', fillColor: [245, 245, 245] }
        },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1, textColor: [0, 0, 0] },
        pageBreak: 'avoid',
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    const msjWpp = document.getElementById('regMensajeCoti').value.trim();
    if (msjWpp !== "") {
        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY + 3,
            margin: { top: 55, bottom: 28, left: 10, right: 10 },
            theme: 'plain',
            body: [[msjWpp]],
            styles: { fontSize: 7, cellPadding: 1, textColor: [80, 80, 80], fontStyle: 'italic' },
            didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
        });
    }

    return {
        pdf,
        folio,
        folioNum: parseInt(document.getElementById('regFolioCoti').getAttribute('data-folionum')) || 900,
        fechaInput,
        emisorSeleccionado,
        cliente,
        telefono,
        email,
        itemsToSave,
        msjWpp,
        metodoPago,
        entrega,
        pago,
        vigencia,
        tasaIvaSeleccionada,
        tipoCliente: document.getElementById('regTipoClienteCoti').value,
        subtotalGlobal,
        totalGlobal
    };
};

if (btnGenerarPDFCotizacionFinal) {
    btnGenerarPDFCotizacionFinal.addEventListener('click', async () => {
        const btnGenerarPDFCotizacionCargando = document.getElementById('btnGenerarPDFCotizacionFinal');
        const btnVistaPreviaPDF = document.getElementById('btnVistaPreviaCotizacion');
        if (btnVistaPreviaPDF) {
            btnVistaPreviaPDF.disabled = true;
        }
        btnGenerarPDFCotizacionCargando.disabled = true;

        const modalEl = document.getElementById('modalCrearCotizacion');
        const esEditar = modalEl && modalEl.getAttribute('data-modo') === 'editar';

        btnGenerarPDFCotizacionCargando.textContent = esEditar ? 'Guardando...' : 'Generando...';

        try {
            const dataCoti = await generarPDFCotizacionObjeto();
            if (!dataCoti) return;

            dataCoti.pdf.save(`Cotización ${dataCoti.cliente} - ${dataCoti.folio} - Proseinet.pdf`);

            try {
                const cotiData = {
                    folio: dataCoti.folio,
                    folioNum: dataCoti.folioNum,
                    fecha: dataCoti.fechaInput,
                    emisor: dataCoti.emisorSeleccionado,
                    cliente: dataCoti.cliente,
                    telefono: dataCoti.telefono,
                    email: dataCoti.email,
                    items: dataCoti.itemsToSave,
                    mensaje: dataCoti.msjWpp,
                    tiempoEntrega: dataCoti.entrega,
                    metodoPago: dataCoti.metodoPago,
                    condicionesPago: dataCoti.pago,
                    vigencia: dataCoti.vigencia,
                    tasaIva: dataCoti.tasaIvaSeleccionada,
                    firma: document.getElementById('regFirmaCoti').value,
                    subtotalGlobal: dataCoti.subtotalGlobal,
                    totalGlobal: dataCoti.totalGlobal,
                    tipoCliente: dataCoti.tipoCliente,
                    ultimaEdicion: new Date()
                };
                await setDoc(doc(db, "cotizaciones", dataCoti.folio), cotiData);
                if (esEditar) {
                    Swal.fire("Cambios Guardados", "La cotización ha sido actualizada correctamente.", "success");
                }
            } catch (err) {
                console.error("Error guardando cotizacion en la BD:", err);
            }

            window.evitarAutoGuardadoCotizacion = true;
            modalCrearCotizacion.hide();
            localStorage.removeItem('cotizacion_temporal');

            if (window.transaccionModoVender && window.equiposVentaPendientes && window.equiposVentaPendientes.length > 0) {
                const clienteVenta = dataCoti.cliente || 'Cliente Proseinet';

                const fechaPagoStrResult = await Swal.fire({
                    title: "Fecha de Pago",
                    text: "Ingresa la fecha de pago para esta venta (Formato AAAA-MM-DD):",
                    input: "text",
                    inputValue: new Date().toISOString().split('T')[0],
                    showCancelButton: true,
                    confirmButtonText: "Aceptar",
                    cancelButtonText: "Cancelar"
                });
                const fechaPagoStr = fechaPagoStrResult.isConfirmed ? (fechaPagoStrResult.value || '') : null;

                if (fechaPagoStr !== null && fechaPagoStr.trim() !== '') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaPagoStr.trim())) {
                        const fechaEntregaStrResult = await Swal.fire({
                            title: "Fecha de Entrega",
                            text: "Ingresa la fecha de entrega para esta venta (Formato AAAA-MM-DD):",
                            input: "text",
                            inputValue: new Date().toISOString().split('T')[0],
                            showCancelButton: true,
                            confirmButtonText: "Aceptar",
                            cancelButtonText: "Cancelar"
                        });
                        const fechaEntregaStr = fechaEntregaStrResult.isConfirmed ? (fechaEntregaStrResult.value || '') : null;

                        if (fechaEntregaStr !== null && fechaEntregaStr.trim() !== '') {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(fechaEntregaStr.trim())) {

                                modalLoading.show();
                                try {
                                    // Realizar la actualización en Firebase para cada equipo
                                    const batchSize = 490;
                                    for (let i = 0; i < window.equiposVentaPendientes.length; i += batchSize) {
                                        const chunk = window.equiposVentaPendientes.slice(i, i + batchSize);
                                        const currentBatch = writeBatch(db);

                                        chunk.forEach(serie => {
                                            const docRef = doc(db, 'almacen', serie);
                                            const d = window.inventarioGlobal.find(item => item.serie === serie) || {};
                                            const updateObj = {
                                                estatus: 'Vendido',
                                                cliente: clienteVenta,
                                                fechaMovimiento: new Date(),
                                                tipoPrecioAbono: dataCoti.tipoCliente || 'publico',
                                                ultimoMovimiento: `Operación múltiple procesada: Vendido`,
                                                fechaSalida: new Date(),
                                                fechaPago: fechaPagoStr.trim(),
                                                fechaEntrega: fechaEntregaStr.trim()
                                            };

                                            const nuevoHistorial = window.procesarTransicionGarantia(d, 'Vendido', new Date(), updateObj.ultimoMovimiento);
                                            if (nuevoHistorial) {
                                                updateObj.historialGarantias = nuevoHistorial;
                                            }

                                            currentBatch.update(docRef, updateObj);
                                        });

                                        await currentBatch.commit();
                                        await new Promise(r => setTimeout(r, 150));
                                    }

                                    window.seriesSeleccionadasGlobal.clear();
                                    window.seleccionGlobal = false;
                                    const chkSelectAll = document.getElementById('chkSelectAll');
                                    if (chkSelectAll) chkSelectAll.checked = false;
                                    verificarSeleccion();
                                    await Swal.fire({
                                        title: "Venta Registrada",
                                        text: `Se han registrado como vendidos e introducidos en la base de datos ${window.equiposVentaPendientes.length} equipos.`,
                                        icon: "success"
                                    });
                                    cargarInventario('inicio', true);
                                } catch (err) {
                                    console.error("Error al actualizar equipos:", err);
                                    await Swal.fire({
                                        title: "Error",
                                        text: "Hubo un error al actualizar los equipos en la base de datos.",
                                        icon: "error"
                                    });
                                } finally {
                                    modalLoading.hide();
                                }
                            } else {
                                await Swal.fire({
                                    title: "Acción Cancelada",
                                    text: "Cancelado: Formato de fecha de entrega incorrecto. No se actualizó el inventario.",
                                    icon: "error"
                                });
                            }
                        } else {
                            await Swal.fire({
                                title: "Acción Cancelada",
                                text: "Cancelado: Se requiere fecha de entrega. No se actualizó el inventario.",
                                icon: "warning"
                            });
                        }
                    } else {
                        await Swal.fire({
                            title: "Acción Cancelada",
                            text: "Cancelado: Formato de fecha de pago incorrecto. No se actualizó el inventario.",
                            icon: "error"
                        });
                    }
                } else {
                    await Swal.fire({
                        title: "Acción Cancelada",
                        text: "Cancelado: Se requiere fecha de pago. No se actualizó el inventario.",
                        icon: "warning"
                    });
                }

                // Resetear estado
                window.transaccionModoVender = false;
                window.equiposVentaPendientes = [];
            }

        } catch (error) {
            console.error("Error al generar cotización", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al generar la cotización",
                icon: "error"
            });
        } finally {
            btnGenerarPDFCotizacionCargando.disabled = false;
            const modalEl = document.getElementById('modalCrearCotizacion');
            const esEditar = modalEl && modalEl.getAttribute('data-modo') === 'editar';
            btnGenerarPDFCotizacionCargando.innerHTML = esEditar
                ? `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`
                : `<i class="fa-solid fa-file-export me-2"></i>Exportar`;
            if (btnVistaPreviaPDF) {
                btnVistaPreviaPDF.disabled = false;
                btnVistaPreviaPDF.innerHTML = '<i class="fa-solid fa-eye me-2"></i>Vista Previa';
            }
        }
    });
}

if (btnVistaPreviaCotizacion) {
    btnVistaPreviaCotizacion.addEventListener('click', async () => {
        const btnVistaPreviaPDF = document.getElementById('btnVistaPreviaCotizacion');
        if (btnVistaPreviaPDF) {
            btnVistaPreviaPDF.disabled = true;
            btnVistaPreviaPDF.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Generando';
        }
        try {
            const dataCoti = await generarPDFCotizacionObjeto();
            if (!dataCoti) return;

            const blob = dataCoti.pdf.output('blob');
            if (activePreviewBlobUrl) {
                URL.revokeObjectURL(activePreviewBlobUrl);
            }
            activePreviewBlobUrl = URL.createObjectURL(blob);
            document.getElementById('iframeVistaPreviaPDF').src = activePreviewBlobUrl;

            window.lastModalOpen = 'coti';
            window.evitarResetModal = true;
            bootstrap.Modal.getInstance(document.getElementById('modalCrearCotizacion')).hide();
            modalVistaPreviaPDF.show();
        } catch (error) {
            console.error("Error al generar vista previa:", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al generar la vista previa",
                icon: "error"
            });
        } finally {
            if (btnVistaPreviaPDF) {
                btnVistaPreviaPDF.disabled = false;
                btnVistaPreviaPDF.innerHTML = '<i class="fa-solid fa-eye me-2"></i>Vista Previa';
            }
        }
    });
}

const generarPDFNotaObjeto = async () => {
    const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
    const esNotaProceso = modalCrearNotaVentaEl ? (modalCrearNotaVentaEl.getAttribute('data-tipo-nota') === 'proceso') : false;

    const cliente = document.getElementById('regClienteNota').value.trim();
    const telefono = document.getElementById('regTelefonoNota').value.trim();
    const email = document.getElementById('regEmailNota').value.trim();

    const fechaInput = document.getElementById('regFechaNota').value;
    const fechaFormateada = fechaInput ? new Date(fechaInput + "T00:00:00").toLocaleDateString('es-MX') : "";
    const folio = document.getElementById('regFolioNota').value.trim();

    const filas = document.querySelectorAll('#tablaItemsNota tbody tr');
    const bodyPDF = [];
    const itemsToSave = [];
    let subtotalGlobal = 0;
    let iterador = 1;

    filas.forEach(fila => {
        const clave = fila.querySelector('.coti-clave').value.trim();
        const desc = fila.querySelector('.coti-desc').value.trim();
        const costo = parseFloat(fila.querySelector('.coti-costo').value) || 0;
        const cant = parseInt(fila.querySelector('.coti-cant').value) || 0;

        if (desc !== "" || clave !== "") {
            const importeFila = costo * cant;
            subtotalGlobal += importeFila;

            const precioMayorista = parseFloat(fila.getAttribute('data-precio-mayorista')) || 0;
            const precioPublico = parseFloat(fila.getAttribute('data-precio-publico')) || 0;
            itemsToSave.push({ clave, desc, costo, cant, precioMayorista, precioPublico });

            bodyPDF.push([
                iterador,
                clave,
                desc,
                `$${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                cant,
                `$${importeFila.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
            ]);
            iterador++;
        }
    });

    if (bodyPDF.length === 0) {
        await Swal.fire({
            title: "Falta Información",
            text: `Agrega al menos un equipo a la ${esNotaProceso ? 'nota de proceso' : 'nota de venta'}`,
            icon: "warning"
        });
        return null;
    }

    const tasaIvaSeleccionada = document.querySelector('input[name="tasaIvaNota"]:checked').value;
    const multiplicadorIva = parseFloat(tasaIvaSeleccionada) / 100;

    const ivaGlobal = subtotalGlobal * multiplicadorIva;
    const totalGlobal = subtotalGlobal + ivaGlobal;

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const logo = new Image();
    logo.src = '/img/PROSEINET-LOGO-PDFs.png';
    const logoPromise = new Promise((resolve) => {
        logo.onload = () => resolve(true);
        logo.onerror = () => resolve(false);
    });

    const logoRedes = new Image();
    logoRedes.src = '/img/redes-pdf.png';
    const logoRedesPromise = new Promise((resolve) => {
        logoRedes.onload = () => resolve(true);
        logoRedes.onerror = () => resolve(false);
    });

    await Promise.all([logoPromise, logoRedesPromise]);

    const emisorSeleccionado = document.getElementById('regEmisorNota').value;
    const pagesDrawn = new Set();

    const drawHeaderAndFooter = (pageNum) => {
        if (pagesDrawn.has(pageNum)) return;
        pagesDrawn.add(pageNum);

        pdf.setFillColor(0, 0, 0);
        pdf.rect(10, 10, 90, 20, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text("Fecha:", 22, 14, { align: "right" });
        pdf.text(esNotaProceso ? "Nota Proceso:" : "Nota de Venta:", 33, 19, { align: "right" });
        pdf.text(fechaFormateada, 46, 14, { align: "right" });
        pdf.text(folio, 50, 19, { align: "right" });

        if (emisorSeleccionado === 'proseinet') {
            pdf.setFillColor(160, 20, 20);
            pdf.rect(10, 22, 90, 20, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("PROSEINET S.A.S. de C.V.", 12, 30);
            pdf.setFontSize(10);
            pdf.text("RFC: PRO1811056Y6", 12, 34);
        } else {
            pdf.setFillColor(6, 75, 167);
            pdf.rect(10, 22, 90, 20, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("Juan José Arreola Bucio", 12, 30);
            pdf.setFontSize(10);
            pdf.text("RFC: AEBJ88090977A", 12, 34);
        }

        if (logo.complete && logo.naturalWidth !== 0) {
            pdf.addImage(logo, 'PNG', 135, -6, 60, 64, undefined, 'FAST');
        }

        const pageHeight = pdf.internal.pageSize.getHeight();
        const footerY = pageHeight - 20;

        pdf.setFillColor(20, 20, 20);
        pdf.rect(10, footerY, 196, 15, 'F');

        if (emisorSeleccionado === 'proseinet') {
            pdf.setFillColor(160, 20, 20);
            pdf.rect(10, footerY - 5, 50, 5, 'F');
        } else {
            pdf.setFillColor(6, 75, 167);
            pdf.rect(10, footerY - 5, 50, 5, 'F');
        }

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("https://proseinet.mx/", 12, footerY - 1.5);

        pdf.setFillColor(110, 110, 110);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Gral. Pedro María Anaya #235 Int. 5, Col. Chapultepec Nte. c.p 58260 Morelia, Mich.", 12, footerY + 4.5);
        pdf.text("Tel: 443 684 3852, 443 273 1724, Correo: proseinet.sas@gmail.com", 12, footerY + 8);

        if (logoRedes.complete && logoRedes.naturalWidth !== 0) {
            pdf.addImage(logoRedes, 'PNG', 135, footerY - 2.5, 60, 20, undefined, 'FAST');
        }
    };

    pdf.autoTable({
        startY: 45,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        body: [
            ['Cliente', cliente],
            ['Teléfono', telefono],
            ['e-mail', email],
            [{ content: esNotaProceso ? 'NOTA DE PROCESO DE EQUIPOS O SERVICIOS' : 'NOTA DE VENTA DE EQUIPOS O SERVICIOS', colSpan: 2, styles: { fillColor: [220, 220, 220], halign: 'center' } }]
        ],
        columnStyles: {
            0: { cellWidth: 35, fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
            1: { cellWidth: 'auto', fillColor: [245, 245, 245], textColor: [0, 0, 0] }
        },
        styles: { fontSize: 9, cellPadding: 1.5, lineColor: [100, 100, 100], lineWidth: 0.1 },
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        head: [['Item', 'Clave', 'Descripción', 'Cost. U', 'Cantidad', 'Importe']],
        body: bodyPDF,
        headStyles: { fillColor: [150, 150, 150], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center', valign: 'middle', fillColor: [230, 230, 230], fontStyle: 'bold' },
            1: { cellWidth: 22, halign: 'center', valign: 'middle' },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] },
            4: { cellWidth: 16, halign: 'center', valign: 'middle', fillColor: [240, 240, 240] },
            5: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] }
        },
        styles: { fontSize: 8, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1, textColor: [0, 0, 0] },
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY,
        margin: { top: 55, bottom: 28, left: 137.9, right: 10 },
        theme: 'grid',
        body: [
            ['Subtotal', `$${subtotalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
            [`IVA (${tasaIvaSeleccionada}%)`, `$${ivaGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
            ['Total', `$${totalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`]
        ],
        columnStyles: {
            0: { cellWidth: 42, fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0] },
            1: { cellWidth: 26, fillColor: [20, 20, 20], fontStyle: 'bold', halign: 'left', textColor: [255, 255, 255] }
        },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1 },
        pageBreak: 'avoid',
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    let currentY = pdf.lastAutoTable.finalY + 5;
    pdf.setFont("helvetica", 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);

    const entrega = document.getElementById('regTiempoEntregaNota').value;
    const metodoPago = document.getElementById('regMetodoPagoNota').value;
    const pago = document.getElementById('regCondicionesPagoNota').value;
    const vigenciaSelectValue = document.getElementById('regVigenciaNota').value;

    const calcularFechaGarantia = (fechaEmisionStr, vigenciaVal) => {
        if (!fechaEmisionStr) return vigenciaVal;
        const fecha = new Date(fechaEmisionStr + "T00:00:00");
        if (isNaN(fecha.getTime())) return vigenciaVal;

        let meses = 0;
        if (vigenciaVal === '1-mes') meses = 1;
        else if (vigenciaVal === '3-meses') meses = 3;
        else if (vigenciaVal === '6-meses') meses = 6;
        else if (vigenciaVal === '12-meses') meses = 12;

        if (meses === 0) return vigenciaVal;

        fecha.setMonth(fecha.getMonth() + meses);
        const dia = String(fecha.getDate()).padStart(2, '0');
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const anio = fecha.getFullYear();
        return `${dia}/${mes}/${anio}`;
    };

    const vigencia = calcularFechaGarantia(fechaInput, vigenciaSelectValue);

    pdf.autoTable({
        startY: currentY,
        margin: { top: 55, bottom: 28, left: 10, right: 10 },
        theme: 'grid',
        body: [
            [{ content: 'Tiempo de entrega', fontStyle: 'bold' }, entrega],
            [{ content: 'Método de Pago', fontStyle: 'bold' }, metodoPago],
            [{ content: 'Condiciones de Pago', fontStyle: 'bold' }, pago],
            [{ content: 'Garantía', fontStyle: 'bold' }, vigencia],
            [{
                content: tasaIvaSeleccionada === '0'
                    ? `*Esta ${esNotaProceso ? 'nota de proceso' : 'nota de venta'} no cuenta con IVA`
                    : `*Esta ${esNotaProceso ? 'nota de proceso' : 'nota de venta'} incluye IVA (${tasaIvaSeleccionada}%)`,
                colSpan: 2,
                fontStyle: 'italic',
                textColor: [80, 80, 80]
            }],
            [{ content: 'Atentamente:\n\n' + document.getElementById('regFirmaNota').value, colSpan: 2, halign: 'center', fontStyle: 'bold' }]
        ],
        columnStyles: {
            0: { cellWidth: 50, fillColor: [240, 240, 240] },
            1: { cellWidth: 'auto', fillColor: [245, 245, 245] }
        },
        styles: { fontSize: 9, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1, textColor: [0, 0, 0] },
        pageBreak: 'avoid',
        didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
    });

    const msjWpp = document.getElementById('regMensajeNota').value.trim();
    currentY = pdf.lastAutoTable.finalY + 5;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (msjWpp !== "") {
        const splitMsj = pdf.splitTextToSize(msjWpp, 280);
        const msjHeight = splitMsj.length * 3;

        if (currentY + msjHeight > pageHeight - 28) {
            pdf.addPage();
            const newPageNum = pdf.internal.getNumberOfPages();
            drawHeaderAndFooter(newPageNum);
            currentY = 55;
        }

        pdf.setFontSize(6);
        pdf.text(splitMsj, 10, currentY);
    }

    return {
        pdf,
        folio,
        folioNum: parseInt(document.getElementById('regFolioNota').getAttribute('data-folionum')) || 900,
        fechaInput,
        emisorSeleccionado,
        cliente,
        telefono,
        email,
        itemsToSave,
        msjWpp,
        entrega,
        metodoPago,
        pago,
        vigencia,
        tasaIvaSeleccionada,
        tipoCliente: document.getElementById('regTipoClienteNota').value,
        subtotalGlobal,
        totalGlobal
    };
};

if (btnVistaPreviaNota) {
    btnVistaPreviaNota.addEventListener('click', async () => {
        const btnVistaPreviaNotaBtn = document.getElementById('btnVistaPreviaNota');
        if (btnVistaPreviaNotaBtn) {
            btnVistaPreviaNotaBtn.disabled = true;
            btnVistaPreviaNotaBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Generando';
        }
        try {
            const dataNota = await generarPDFNotaObjeto();
            if (!dataNota) return;

            const blob = dataNota.pdf.output('blob');
            if (activePreviewBlobUrl) {
                URL.revokeObjectURL(activePreviewBlobUrl);
            }
            activePreviewBlobUrl = URL.createObjectURL(blob);
            document.getElementById('iframeVistaPreviaPDF').src = activePreviewBlobUrl;

            window.lastModalOpen = 'nota';
            window.evitarResetModal = true;
            bootstrap.Modal.getInstance(document.getElementById('modalCrearNotaVenta')).hide();
            modalVistaPreviaPDF.show();
        } catch (error) {
            console.error("Error al generar vista previa:", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al generar la vista previa",
                icon: "error"
            });
        } finally {
            if (btnVistaPreviaNotaBtn) {
                btnVistaPreviaNotaBtn.disabled = false;
                btnVistaPreviaNotaBtn.innerHTML = '<i class="fa-solid fa-eye me-2"></i>Vista Previa';
            }
        }
    });
}



if (btnGenerarPDFNotaFinal) {
    btnGenerarPDFNotaFinal.addEventListener('click', async () => {
        const btnGenerarPDFNotaCargando = document.getElementById('btnGenerarPDFNotaFinal');
        const btnVistaPreviaNotaBtn = document.getElementById('btnVistaPreviaNota');
        if (btnVistaPreviaNotaBtn) {
            btnVistaPreviaNotaBtn.disabled = true;
        }
        btnGenerarPDFNotaCargando.disabled = true;

        const modalEl = document.getElementById('modalCrearNotaVenta');
        const esEditar = modalEl && modalEl.getAttribute('data-modo') === 'editar';

        btnGenerarPDFNotaCargando.textContent = esEditar ? 'Guardando...' : 'Generando...';

        try {
            const dataNota = await generarPDFNotaObjeto();
            if (!dataNota) return;

            const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
            const esNotaProceso = modalCrearNotaVentaEl ? (modalCrearNotaVentaEl.getAttribute('data-tipo-nota') === 'proceso') : false;

            const nombreArchivo = esNotaProceso
                ? `Nota de Proceso ${dataNota.cliente} - ${dataNota.folio} - Proseinet.pdf`
                : `Nota de Venta ${dataNota.cliente} - ${dataNota.folio} - Proseinet.pdf`;
            dataNota.pdf.save(nombreArchivo);

            try {
                const cotiData = {
                    folio: dataNota.folio,
                    folioNum: dataNota.folioNum,
                    fecha: dataNota.fechaInput,
                    emisor: dataNota.emisorSeleccionado,
                    cliente: dataNota.cliente,
                    telefono: dataNota.telefono,
                    email: dataNota.email,
                    items: dataNota.itemsToSave,
                    mensaje: dataNota.msjWpp,
                    tiempoEntrega: dataNota.entrega,
                    metodoPago: dataNota.metodoPago,
                    condicionesPago: dataNota.pago,
                    vigencia: dataNota.vigencia,
                    tasaIva: dataNota.tasaIvaSeleccionada,
                    firma: document.getElementById('regFirmaNota').value,
                    subtotalGlobal: dataNota.subtotalGlobal,
                    totalGlobal: dataNota.totalGlobal,
                    tipoCliente: dataNota.tipoCliente,
                    ultimaEdicion: new Date(),
                    tipo: 'nota',
                    tipoNota: esNotaProceso ? 'proceso' : 'venta'
                };
                await setDoc(doc(db, "cotizaciones", dataNota.folio), cotiData);
                if (esEditar) {
                    Swal.fire("Cambios Guardados", `La ${esNotaProceso ? 'nota de proceso' : 'nota de venta'} ha sido actualizada correctamente.`, "success");
                }
            } catch (err) {
                console.error("Error guardando nota de venta en la BD:", err);
            }

            modalCrearNotaVenta.hide();

            if (window.transaccionModoVender && window.equiposVentaPendientes && window.equiposVentaPendientes.length > 0) {
                const clienteVenta = dataNota.cliente || 'Cliente Proseinet';

                const fechaPagoStrResult = await Swal.fire({
                    title: "Fecha de Pago",
                    text: "Ingresa la fecha de pago para esta venta (Formato AAAA-MM-DD):",
                    input: "text",
                    inputValue: new Date().toISOString().split('T')[0],
                    showCancelButton: true,
                    confirmButtonText: "Aceptar",
                    cancelButtonText: "Cancelar"
                });
                const fechaPagoStr = fechaPagoStrResult.isConfirmed ? (fechaPagoStrResult.value || '') : null;

                if (fechaPagoStr !== null && fechaPagoStr.trim() !== '') {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaPagoStr.trim())) {
                        const fechaEntregaStrResult = await Swal.fire({
                            title: "Fecha de Entrega",
                            text: "Ingresa la fecha de entrega para esta venta (Formato AAAA-MM-DD):",
                            input: "text",
                            inputValue: new Date().toISOString().split('T')[0],
                            showCancelButton: true,
                            confirmButtonText: "Aceptar",
                            cancelButtonText: "Cancelar"
                        });
                        const fechaEntregaStr = fechaEntregaStrResult.isConfirmed ? (fechaEntregaStrResult.value || '') : null;

                        if (fechaEntregaStr !== null && fechaEntregaStr.trim() !== '') {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(fechaEntregaStr.trim())) {

                                modalLoading.show();
                                try {
                                    const batchSize = 490;
                                    for (let i = 0; i < window.equiposVentaPendientes.length; i += batchSize) {
                                        const chunk = window.equiposVentaPendientes.slice(i, i + batchSize);
                                        const currentBatch = writeBatch(db);

                                        chunk.forEach(serie => {
                                            const docRef = doc(db, 'almacen', serie);
                                            const d = window.inventarioGlobal.find(item => item.serie === serie) || {};
                                            const updateObj = {
                                                estatus: 'Vendido',
                                                cliente: clienteVenta,
                                                fechaMovimiento: new Date(),
                                                tipoPrecioAbono: dataNota.tipoCliente || 'publico',
                                                ultimoMovimiento: `Operación múltiple procesada: Vendido`,
                                                fechaSalida: new Date(),
                                                fechaPago: fechaPagoStr.trim(),
                                                fechaEntrega: fechaEntregaStr.trim()
                                            };

                                            const nuevoHistorial = window.procesarTransicionGarantia(d, 'Vendido', new Date(), updateObj.ultimoMovimiento);
                                            if (nuevoHistorial) {
                                                updateObj.historialGarantias = nuevoHistorial;
                                            }

                                            currentBatch.update(docRef, updateObj);
                                        });

                                        await currentBatch.commit();
                                        await new Promise(r => setTimeout(r, 150));
                                    }

                                    window.seriesSeleccionadasGlobal.clear();
                                    window.seleccionGlobal = false;
                                    const chkSelectAll = document.getElementById('chkSelectAll');
                                    if (chkSelectAll) chkSelectAll.checked = false;
                                    verificarSeleccion();
                                    await Swal.fire({
                                        title: "Venta Registrada",
                                        text: `Se han registrado como vendidos e introducidos en la base de datos ${window.equiposVentaPendientes.length} equipos.`,
                                        icon: "success"
                                    });
                                    cargarInventario('inicio', true);
                                } catch (err) {
                                    console.error("Error al actualizar equipos:", err);
                                    await Swal.fire({
                                        title: "Error",
                                        text: "Hubo un error al actualizar los equipos en la base de datos.",
                                        icon: "error"
                                    });
                                } finally {
                                    modalLoading.hide();
                                }
                            } else {
                                await Swal.fire({
                                    title: "Acción Cancelada",
                                    text: "Cancelado: Formato de fecha de entrega incorrecto. No se actualizó el inventario.",
                                    icon: "error"
                                });
                            }
                        } else {
                            await Swal.fire({
                                title: "Acción Cancelada",
                                text: "Cancelado: Se requiere fecha de entrega. No se actualizó el inventario.",
                                icon: "warning"
                            });
                        }
                    } else {
                        await Swal.fire({
                            title: "Acción Cancelada",
                            text: "Cancelado: Formato de fecha de pago incorrecto. No se actualizó el inventario.",
                            icon: "error"
                        });
                    }
                } else {
                    await Swal.fire({
                        title: "Acción Cancelada",
                        text: "Cancelado: Se requiere fecha de pago. No se actualizó el inventario.",
                        icon: "warning"
                    });
                }

                window.transaccionModoVender = false;
                window.equiposVentaPendientes = [];
            }

        } catch (error) {
            const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
            const esNotaProceso = modalCrearNotaVentaEl ? (modalCrearNotaVentaEl.getAttribute('data-tipo-nota') === 'proceso') : false;
            console.error(`Error al generar la ${esNotaProceso ? 'nota de proceso' : 'nota de venta'}`, error);
            await Swal.fire({
                title: "Error",
                text: `Ocurrió un error al generar la ${esNotaProceso ? 'nota de proceso' : 'nota de venta'}`,
                icon: "error"
            });
        } finally {
            btnGenerarPDFNotaCargando.disabled = false;
            const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
            const esNotaProceso = modalCrearNotaVentaEl ? (modalCrearNotaVentaEl.getAttribute('data-tipo-nota') === 'proceso') : false;
            const esEditar = modalCrearNotaVentaEl && modalCrearNotaVentaEl.getAttribute('data-modo') === 'editar';
            btnGenerarPDFNotaCargando.innerHTML = esEditar
                ? `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`
                : `<i class="fa-solid fa-file-export me-2"></i>Exportar ${esNotaProceso ? 'Nota de Proceso' : 'Nota de Venta'}`;
            if (btnVistaPreviaNotaBtn) {
                btnVistaPreviaNotaBtn.disabled = false;
                btnVistaPreviaNotaBtn.innerHTML = '<i class="fa-solid fa-eye me-2"></i>Vista Previa';
            }
            deseleccionarItems();
        }
    });
}

const modalVistaPreviaPDFEl = document.getElementById('modalVistaPreviaPDF');
if (modalVistaPreviaPDFEl) {
    modalVistaPreviaPDFEl.addEventListener('hidden.bs.modal', () => {
        document.getElementById('iframeVistaPreviaPDF').src = 'about:blank';
        if (activePreviewBlobUrl) {
            URL.revokeObjectURL(activePreviewBlobUrl);
            activePreviewBlobUrl = null;
        }
        window.evitarResetModal = false;

        if (window.lastModalOpen === 'nota') {
            bootstrap.Modal.getInstance(document.getElementById('modalCrearNotaVenta')).show();
        } else if (window.lastModalOpen === 'historial') {
            new bootstrap.Modal(document.getElementById('modalHistorialCotizaciones')).show();
        } else if (window.lastModalOpen === 'acta') {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalActaEntrega')).show();
        } else if (window.lastModalOpen === 'coti') {
            bootstrap.Modal.getInstance(document.getElementById('modalCrearCotizacion')).show();
        }
    });
}

if (btnExportarPDF) {
    btnExportarPDF.addEventListener('click', async () => {
        const confirmExportacion = await Swal.fire({
            title: '¿Estás seguro de que deseas exportar la consulta actual?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#28a04cff',
            cancelButtonColor: '#999999ff',
            confirmButtonText: 'Exportar PDF',
            cancelButtonText: 'Cancelar'
        });
        if (!confirmExportacion.isConfirmed) return;

        try {
            modalPDFLoading.show();

            const categoriaFiltro = document.getElementById('filtroCategoria').value.trim().toLowerCase();
            const estatusFiltro = document.getElementById('filtroEstatus').value.trim().toLowerCase();
            const condicionFiltro = document.getElementById('filtroCondicion').value.trim().toLowerCase();
            const busqueda = document.getElementById('buscadorGeneral').value.trim().toLowerCase();
            const fechaInicio = document.getElementById('filtroFechaInicio') ? document.getElementById('filtroFechaInicio').value : '';
            const fechaFin = document.getElementById('filtroFechaFin') ? document.getElementById('filtroFechaFin').value : '';

            let resultadosExportar = [];

            inventarioGlobal.forEach((data) => {

                const catDoc = String(data.categoria || '').trim().toLowerCase();
                const estDoc = String(data.estatus || '').trim().toLowerCase();
                const condDoc = String(data.condicion || '').trim().toLowerCase();

                let pasaFiltros = true;

                if (categoriaFiltro !== '' && catDoc !== categoriaFiltro) pasaFiltros = false;

                if (estatusFiltro !== '') {
                    if (estatusFiltro === 'almacén' || estatusFiltro === 'almacen') {
                        if (estDoc !== 'almacén' && estDoc !== 'almacen') pasaFiltros = false;
                    } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                        if (estDoc !== 'en garantía' && estDoc !== 'en garantia') pasaFiltros = false;
                    } else {
                        if (estDoc !== estatusFiltro) pasaFiltros = false;
                    }
                }

                if (condicionFiltro !== '' && condDoc !== condicionFiltro) pasaFiltros = false;


                if (pasaFiltros && window.seriesEscaneadas && window.seriesEscaneadas.size > 0) {
                    const serie = String(data.serie || '').trim().toLowerCase();
                    if (!window.seriesEscaneadas.has(serie)) {
                        pasaFiltros = false;
                    }
                } else if (pasaFiltros && busqueda !== '') {
                    const serie = String(data.serie || '').toLowerCase();
                    const categoria = String(data.categoria || '').toLowerCase();
                    const modelo = String(data.modelo || '').toLowerCase();
                    const procesador = String(data.procesador || '').toLowerCase();
                    const marca = String(data.marca || '').toLowerCase();
                    const cliente = String(data.cliente || '').toLowerCase();
                    const lote = String(data.nLot || '').toLowerCase();

                    if (!serie.includes(busqueda) && !modelo.includes(busqueda) && !procesador.includes(busqueda) && !marca.includes(busqueda) && !cliente.includes(busqueda)) {
                        pasaFiltros = false;
                    }
                }

                if (pasaFiltros && (fechaInicio !== '' || fechaFin !== '')) {
                    let fEntrega = String(data.fechaEntrega || '');
                    let fPago = String(data.fechaPago || '');
                    let fMovimiento = '';

                    if (data.fechaMovimiento) {
                        fMovimiento = data.fechaMovimiento.toDate ? data.fechaMovimiento.toDate().toISOString().split('T')[0] : '';
                    }

                    const checkRango = (fecha) => {
                        if (!fecha || fecha.trim() === '') return false;
                        let f = fecha.trim().substring(0, 10);

                        if (f.includes('/')) {
                            const p = f.split('/');
                            if (p.length === 3) {
                                if (p[2].length === 4) f = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                                else if (p[0].length === 4) f = `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
                            }
                        }

                        if (fechaInicio !== '' && f < fechaInicio) return false;
                        if (fechaFin !== '' && f > fechaFin) return false;
                        return true;
                    };

                    if (!checkRango(fEntrega) && !checkRango(fPago) && !checkRango(fMovimiento)) {
                        pasaFiltros = false;
                    }
                }

                if (pasaFiltros) {
                    resultadosExportar.push(data);
                }
            });

            resultadosExportar.sort((a, b) => {
                const parseDateSort = (d) => {
                    if (!d) return Number.MAX_SAFE_INTEGER;

                    if (d.toDate) {
                        const dateObj = d.toDate();
                        const y = dateObj.getFullYear();
                        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        return Number(`${y}${m}${day}`);
                    }

                    let val = String(d).trim();
                    if (val.includes('-')) return Number(val.replace(/-/g, ''));
                    if (val.includes('/')) {
                        const p = val.split('/');
                        if (p.length === 3) {
                            if (p[2].length === 4) return Number(`${p[2]}${p[1].padStart(2, '0')}${p[0].padStart(2, '0')}`);
                            if (p[0].length === 4) return Number(`${p[0]}${p[1].padStart(2, '0')}${p[2].padStart(2, '0')}`);
                        }
                    }
                    return Number.MAX_SAFE_INTEGER;
                };

                let entregaA = parseDateSort(b.fechaEntrega);
                let entregaB = parseDateSort(a.fechaEntrega);

                if (entregaA !== entregaB) {
                    return entregaA - entregaB;
                }

                let pagoA = parseDateSort(b.fechaPago);
                let pagoB = parseDateSort(a.fechaPago);

                return pagoA - pagoB;
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                compress: true
            });
            const logo = new Image();
            logo.src = '/img/Proseinet-Logo-Web.png';

            await new Promise((resolve) => {
                logo.onload = () => {
                    pdf.setFillColor(180, 6, 6);
                    pdf.rect(0, 0, 300, 24, 'F');
                    //LOGO (x) (y) (w) (h)
                    pdf.addImage(logo, 'PNG', 14, 4, 24, 18, undefined, 'FAST');

                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(18);
                    pdf.text(" Reporte de Inventario", 40, 16);

                    resolve();
                };

                logo.onerror = () => {
                    pdf.setFillColor(180, 6, 6);
                    pdf.rect(0, 0, 300, 20, 'F');
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFontSize(18);
                    pdf.text("PROSEINET - Reporte de Inventario", 14, 14);
                    resolve();
                };
            });

            pdf.setTextColor(40, 40, 40);
            pdf.setFontSize(12);
            pdf.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-MX')}`, 14, 40);

            let textoFiltros = `Categoria: ${document.getElementById('filtroCategoria').value || 'Todas'} | Estatus: ${document.getElementById('filtroEstatus').value || 'Todos'} | Condicion: ${document.getElementById('filtroCondicion').value || 'Todas'}`;
            if (busqueda) textoFiltros += ` | Busqueda: "${busqueda}"`;
            if (fechaInicio || fechaFin) {
                const fInicioStr = fechaInicio ? new Date(fechaInicio + "T00:00:00").toLocaleDateString('es-MX') : 'Inicio';
                const fFinStr = fechaFin ? new Date(fechaFin + "T00:00:00").toLocaleDateString('es-MX') : 'Fin';
                textoFiltros += ` | Fecha Filtrada: "${fInicioStr} al ${fFinStr}"`;
            }
            let totalPrecioMayorista = resultadosExportar.reduce((acc, curr) => acc + (Number(curr.precioMayorista) || 0), 0);
            let totalPrecioPublico = resultadosExportar.reduce((acc, curr) => acc + (Number(curr.precioPublico) || 0), 0);

            let totalAbonos = 0;
            let totalSaldoRestante = 0;
            if (estatusFiltro === 'proceso') {
                resultadosExportar.forEach(curr => {
                    const historial = curr.historialAbonos || [];
                    const abonado = historial.reduce((sum, item) => sum + Number(item.monto), 0);
                    const tipoPrecio = curr.tipoPrecioAbono || 'publico';
                    const precioTotal = tipoPrecio === 'publico' ? (Number(curr.precioPublico) || 0) : (Number(curr.precioMayorista) || 0);
                    const saldo = precioTotal - abonado;
                    totalAbonos += abonado;
                    totalSaldoRestante += saldo;
                });
            }

            let formatoTotalMay = `$${totalPrecioMayorista.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
            let formatoTotalPub = `$${totalPrecioPublico.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
            let formatoTotalAbonos = `$${totalAbonos.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
            let formatoTotalSaldo = `$${totalSaldoRestante.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

            pdf.setFontSize(14);
            pdf.setTextColor(255, 255, 255);
            pdf.text(`Total de equipos exportados: ${resultadosExportar.length}`, 200, 14);
            pdf.setTextColor(40, 40, 40);
            pdf.setFontSize(12);
            pdf.text(textoFiltros, 14, 46);
            pdf.setFontSize(10);

            const body = resultadosExportar.map(d => {
                const fEntrega = d.fechaEntrega ? d.fechaEntrega : 'N/A';
                const fPago = d.fechaPago ? d.fechaPago : 'N/A';

                if ((estatusFiltro === 'por habilitar') || (estatusFiltro === 'falta pza')) {
                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || ''}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.comentarios || 'N/A',
                        `$${Number(d.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(d.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                } else if (estatusFiltro === 'proceso') {
                    const historial = d.historialAbonos || [];
                    const abonado = historial.reduce((sum, item) => sum + Number(item.monto), 0);
                    const tipoPrecio = d.tipoPrecioAbono || 'publico';
                    const precioTotal = tipoPrecio === 'publico' ? (Number(d.precioPublico) || 0) : (Number(d.precioMayorista) || 0);
                    const saldo = precioTotal - abonado;


                    let displayFechaPago = 'N/A';
                    if (historial.length > 0) {
                        const ultimoAbono = historial[historial.length - 1];
                        if (ultimoAbono.fecha) {
                            displayFechaPago = new Date(ultimoAbono.fecha + "T00:00:00").toLocaleDateString('es-MX');
                        }
                    } else if (fPago !== 'N/A') {
                        displayFechaPago = new Date(fPago + "T00:00:00").toLocaleDateString('es-MX');
                    }

                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || 'N/A'}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.cliente || 'Sin Asignar',
                        fEntrega !== 'N/A' ? new Date(fEntrega + "T00:00:00").toLocaleDateString('es-MX') : 'N/A',
                        displayFechaPago,
                        `$${Number(precioTotal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(abonado).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(saldo).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                } else if (estatusFiltro === 'vendido') {
                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || 'N/A'}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.cliente || 'Sin Asignar',
                        fEntrega !== 'N/A' ? new Date(fEntrega + "T00:00:00").toLocaleDateString('es-MX') : 'N/A',
                        fPago !== 'N/A' ? new Date(fPago + "T00:00:00").toLocaleDateString('es-MX') : 'N/A',
                        `$${Number(d.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(d.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || 'N/A'}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.cliente || 'Sin Asignar',
                        d.comentarios || 'N/A',
                        `$${Number(d.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(d.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                } else if (estatusFiltro === 'almacen' || estatusFiltro === 'almacén') {
                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || 'N/A'}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.comentarios || 'N/A',
                        `$${Number(d.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(d.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                } else {
                    return [
                        d.serie || 'N/A',
                        d.categoria || 'N/A',
                        d.estatus || 'N/A',
                        `${d.marca || ''} ${d.modelo || ''}`.trim(),
                        `${d.procesador || 'N/A'}`.trim(),
                        `${d.ram || 'N/A'}`.trim(),
                        `${d.ssd || 'N/A'}`.trim(),
                        d.comentarios || 'N/A',
                        `$${Number(d.precioMayorista || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        `$${Number(d.precioPublico || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                    ];
                }
            });

            if (estatusFiltro === 'por habilitar') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Observaciones', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 7, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [124, 57, 3] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (estatusFiltro === 'falta pza') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Observaciones', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 7, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [190, 8, 8] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (estatusFiltro === 'proceso') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Cliente', 'Fecha Entrega', 'Fecha Abono', 'Abonos', 'Saldo Restante']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 9, styles: { halign: 'right' } }, formatoTotalAbonos, formatoTotalSaldo]],
                    theme: 'striped',
                    headStyles: { fillColor: [218, 97, 17] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (estatusFiltro === 'vendido') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Cliente', 'Fecha Entrega', 'Fecha Pago', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 9, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [54, 101, 255] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (estatusFiltro === 'almacen' || estatusFiltro === 'almacén') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Observaciones', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 7, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [72, 133, 72] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else if (estatusFiltro === 'en garantía' || estatusFiltro === 'en garantia') {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Cliente', 'Observaciones', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 8, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [180, 6, 6] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            } else {
                pdf.autoTable({
                    startY: 52,
                    head: [['Serie', 'Categoria', 'Estatus', 'Equipo', 'Procesador', 'RAM', 'Almacenamiento', 'Observaciones', 'Precio (May)', 'Precio (Final)']],
                    body: body,
                    foot: [[{ content: 'TOTAL', colSpan: 8, styles: { halign: 'right' } }, formatoTotalMay, formatoTotalPub]],
                    theme: 'striped',
                    headStyles: { fillColor: [180, 6, 6] },
                    footStyles: { fillColor: [220, 220, 220], textColor: [20, 20, 20], fontStyle: 'bold' },
                    styles: { fontSize: 8, cellPadding: 2 },
                    alternateRowStyles: { fillColor: [245, 245, 245] }
                });
            }

            pdf.save(`Reporte_Inventario_Proseinet_${new Date().getTime()}.pdf`);
            modalPDFLoading.hide();

        } catch (error) {
            console.error("Error al exportar PDF: ", error);
            await Swal.fire({
                title: "Error",
                text: "Ocurrió un error al generar el PDF de la consulta",
                icon: "error"
            });
            modalPDFLoading.hide();
        }
    });
}

window.descargarNota = async (serie) => {
    const { jsPDF } = window.jspdf;
    const docRef = doc(db, 'almacen', serie);
    const snap = await getDoc(docRef);
    const d = snap.data();

    const pdf = new jsPDF({
        compress: true
    });

    const logo = new Image();
    logo.src = '/img/Proseinet-Logo-Web.png';

    let fechaEntrega = formatearFechaEstricta(d.fechaEntrega, true);
    let fechaPago = formatearFechaEstricta(d.fechaPago, true);

    await new Promise((resolve) => {
        logo.onload = () => {
            pdf.setFillColor(180, 6, 6);
            pdf.rect(0, 0, 210, 45, 'F');

            pdf.addImage(logo, 'PNG', 15, 8, 24, 18, undefined, 'FAST');

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(14);
            pdf.text("Nota de Venta | Inventario", 15, 35);
            pdf.setFontSize(11);
            pdf.text(`Serie: ${d.serie}`, 15, 41);

            resolve();
        };

        logo.onerror = () => {
            pdf.setFillColor(180, 6, 6);
            pdf.rect(0, 0, 210, 45, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(22);
            pdf.text("PROSEINET", 20, 20);
            pdf.setFontSize(12);
            pdf.text("Nota de Venta de Inventario", 20, 30);
            pdf.text(`Serie: ${d.serie}`, 20, 38);
            resolve();
        };
    });

    pdf.setTextColor(40, 40, 40);
    pdf.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 140, 55);

    const body = [
        ["Categoría", d.categoria],
        ["Equipo", `${d.marca} ${d.modelo} ${d.pantalla}`],
        ["Procesador", `${d.procesador} ${d.generacion || 'N/A'}`],
        ["Memoria RAM", d.ram],
        ["Almacenamiento", `SSD: ${d.ssd || 'No'} / HDD: ${d.hdd || 'No'}`],
        ["Sistema Operativo", d.os || "N/A", d.licencia || "N/A"],
        ["Condición del Equipo", d.condicion],
        ["Observaciones Estéticas", d.estetica || "Excelente estado"],
        ["Cliente", d.cliente],
        ["Precio de Mayorista", `$${Number(d.precioMayorista).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
        ["Fecha de Pago", fechaPago],
        ["Fecha de Entrega", fechaEntrega]
    ];

    pdf.autoTable({
        startY: 65,
        head: [['Concepto', 'Detalle Técnico']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [180, 6, 6] },
        styles: { fontSize: 10 }
    });

    pdf.save(`Nota_Proseinet_${d.serie}.pdf`);

    if (d.estatus !== 'Vendido') {
        const confirmarVentaResult = await Swal.fire({
            title: "¿Marcar como Vendido?",
            text: "La nota de venta se ha generado. ¿Deseas marcar este equipo como 'Vendido' en el inventario de forma automática?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Sí, marcar como vendido",
            cancelButtonText: "No, mantener estado"
        });
        if (confirmarVentaResult.isConfirmed) {
            const tipoPrecioResult = await Swal.fire({
                title: "Tipo de Precio",
                text: "¿Qué tipo de precio aplica para este producto?",
                input: "select",
                inputOptions: {
                    "publico": "Precio Público",
                    "mayorista": "Precio Mayorista"
                },
                inputPlaceholder: "Selecciona el tipo de precio",
                showCancelButton: true,
                confirmButtonText: "Aceptar",
                cancelButtonText: "Cancelar",
                inputValidator: (value) => {
                    if (!value) {
                        return "Debes seleccionar un tipo de precio";
                    }
                }
            });

            const tipoPrecio = tipoPrecioResult.isConfirmed ? tipoPrecioResult.value : null;
            if (!tipoPrecio) return;

            const updateObj = {
                estatus: 'Vendido',
                fechaSalida: new Date(),
                tipoPrecioAbono: tipoPrecio
            };
            const nuevoHistorial = window.procesarTransicionGarantia(d, 'Vendido', new Date(), "Venta individual desde Nota de Venta");
            if (nuevoHistorial) {
                updateObj.historialGarantias = nuevoHistorial;
            }
            await updateDoc(docRef, updateObj);
            bootstrap.Modal.getInstance(document.getElementById('modalDetallesEquipo')).hide();
            cargarInventario('inicio', true);
        }
    }
};

document.addEventListener('DOMContentLoaded', cargarInventario);
btnBuscar.addEventListener('click', () => {
    paginaActual = 1;
    cargarInventario('inicio', false);
});

let scannerBuffer = '';
let lastKeyTime = 0;

document.addEventListener('keypress', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }

    const currentTime = Date.now();

    if (currentTime - lastKeyTime > 50) {
        scannerBuffer = '';
    }

    if (e.key === 'Enter') {
        if (scannerBuffer.length > 2) {
            e.preventDefault();
            window.seriesEscaneadas.add(scannerBuffer.trim().toLowerCase());
            const buscador = document.getElementById('buscadorGeneral');
            if (buscador) {
                buscador.value = `[Escaneados: ${window.seriesEscaneadas.size}]`;
                paginaActual = 1;
                cargarInventario('inicio', false);
                if (typeof window.scrollToTableHeader === 'function') {
                    window.scrollToTableHeader();
                }
            }
            scannerBuffer = '';
        }
    } else if (e.key.length === 1) {
        scannerBuffer += e.key;
    }

    lastKeyTime = currentTime;
});

const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');
if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', async () => {
        try {
            if (typeof modalLoading !== 'undefined' && modalLoading !== null) {
                modalLoading.show();
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            window.ordenFechaActivo = false;
            window.ordenClienteAlfabActivo = false;
            window.ordenCategoriaActivo = false;
            window.ordenClienteAlfabDir = 'asc';
            window.ordenCategoriaDir = 'asc';
            window.ordenFechaDir = 'desc';

            document.getElementById('filtroCategoria').value = '';
            document.getElementById('filtroEstatus').value = '';
            document.getElementById('filtroCondicion').value = '';
            if (document.getElementById('filtroFechaInicio')) document.getElementById('filtroFechaInicio').value = '';
            if (document.getElementById('filtroFechaFin')) document.getElementById('filtroFechaFin').value = '';
            document.getElementById('buscadorGeneral').value = '';
            if (window.seriesEscaneadas) {
                window.seriesEscaneadas.clear();
            }

            paginaActual = 1;
            await cargarInventario('inicio', false);
            if (typeof window.scrollToTop === 'function') {
                window.scrollToTop();
            }
        } catch (error) {
            console.error("Error al limpiar filtros:", error);
        } finally {
            if (typeof modalLoading !== 'undefined' && modalLoading !== null) {
                modalLoading.hide();
                if (typeof window.scrollToTop === 'function') {
                    window.scrollToTop();
                }
            }
        }
    });
}

const btnImportarExcel = document.getElementById('btnImportarExcel');
const inputFileExcel = document.getElementById('inputFileExcel');

btnImportarExcel.addEventListener('click', (e) => {
    e.preventDefault();
    inputFileExcel.click();
});

const formatearFechaEstricta = (fechaData, modoTextoLargo = false) => {
    if (!fechaData) return 'Fecha no disponible';

    const opcionesLargo = { year: 'numeric', month: 'long', day: 'numeric' };

    const opcionesFormato = modoTextoLargo ? opcionesLargo : undefined;

    try {
        if (fechaData.toDate) {
            return fechaData.toDate().toLocaleDateString('es-MX', opcionesFormato);
        } else if (fechaData.seconds) {
            return new Date(fechaData.seconds * 1000).toLocaleDateString('es-MX', opcionesFormato);
        } else if (typeof fechaData === 'string') {
            if (fechaData.includes('-') && fechaData.length === 10) {
                const [year, month, day] = fechaData.split('-');
                const fechaLocal = new Date(year, month - 1, day);
                return fechaLocal.toLocaleDateString('es-MX', opcionesFormato);
            }
            return fechaData;
        }
    } catch (e) {
        console.error('Error procesando fecha:', e);
        return 'Error en fecha';
    }
    return 'Formato desconocido';
};

function procesarFechaExcel(valorFecha) {
    if (!valorFecha) return "";

    if (typeof valorFecha === 'number') {
        const fechaJS = new Date(Math.round((valorFecha - 25569) * 86400 * 1000));
        const year = fechaJS.getUTCFullYear();
        const mes = String(fechaJS.getUTCMonth() + 1).padStart(2, '0');
        const dia = String(fechaJS.getUTCDate()).padStart(2, '0');

        return `${year}-${mes}-${dia}`;
    }

    let texto = String(valorFecha).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return texto;
    }

    texto = texto.replace(/-/g, '/');

    if (texto.includes('/')) {
        const partes = texto.split('/');
        if (partes.length === 3) {
            if (partes[2].length === 4) {
                return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
            } else if (partes[0].length === 4) {
                return `${partes[0]}-${partes[1].padStart(2, '0')}-${partes[2].padStart(2, '0')}`;
            }
        }
    }
    return texto;
}

inputFileExcel.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    modalCarga.show();

    cuerpoTabla.innerHTML =
        '<tr><td colspan="10" class="text-center text-primary"><div class="spinner-border spinner-border-sm me-2"></div>Procesando Excel... esto puede tomar unos segundos</td></tr>';

    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            let currentBatch = writeBatch(db);
            let operationCount = 0;
            let registrosProcesados = 0;

            for (let index = 0; index < jsonData.length; index++) {
                const rawRow = jsonData[index];

                const row = {};
                for (let key in rawRow) {
                    row[key.trim().toUpperCase()] = rawRow[key];
                }

                const serieOriginal = row['SERIE'] || row['TAG / SERIE'] || "";
                let serieFinal = "";

                const serieUpper = String(serieOriginal).trim().toUpperCase();

                if (serieUpper === '' || serieUpper === 'N/A' || serieUpper === 'N-A' || serieUpper === 'NA' || serieUpper === 'SIN SERIE') {
                    serieFinal = `S-N-${new Date().getTime()}-${index}`;
                } else {
                    serieFinal = String(serieOriginal).trim().toUpperCase().replace(/\//g, '-');
                }

                if (serieFinal === '.' || serieFinal === '..') {
                    continue;
                }

                const docRef = doc(db, 'almacen', serieFinal);

                const dataMapeada = {
                    nLot: row['NLOT'] || row['LOT'] || "",
                    estatus: row['ESTATUS'] || row['STATUS'] || "Almacén",
                    precioMayorista: Number(row['PRECIO PARA MAYORISTA']) || 0,
                    precioPublico: Number(row['PRECIO SUGERIDO USUARIO FINAL']) || 0,
                    serie: serieFinal,
                    categoria: row['CATEGORIA'] || row['FAMILY'] || row['FAMILY '] || row['FAMILY'] || "SIN CATEGORIA",
                    marca: row['MARCA'] || "",
                    modelo: row['MODELO'] || row['MODELO'] || row['DESCRIPTION'] || "",
                    condicion: row['CONDITIONS'] || row['CONDICIÓN'] || row['GRADO'] || "NO DEFINIDA",
                    procesador: row['PROCESADOR.'] || row['MICRO- PROC.'] || row['PROCESADOR'] || "",
                    generacion: row['GENERATION'] || row['GENERATIO'] || row['GENERATION MICRO-PROC.'] || "",
                    velocidad: row['PROC. SPEED'] || "",
                    ram: row['RAM'] || row['RAM (GB)'] || "",
                    tipoRam: row['TIPO DE RAM'] || "",
                    hdd: row['HDD MECÁNICO'] || row['HD MECANICO'] || row['HD (GB)'] || "",
                    ssd: row['HD SOLIDO'] || row['SSD'] || "",
                    discoExtra: row['DISCO EXTRA'] || "",
                    capacidadExtra: row['CAPACIDAD DISCO EXTRA'] || "",
                    videoDedicado: row['T. VIDEO DEDICADA'] || "",
                    descVideo: row['DESCIPCIÓN T. VIDEO'] || "",
                    pantalla: row['DISPLAY O MONITOR'] || "",
                    cam: row['CAM'] || "",
                    cddvd: row['CD/DVD'] || "",
                    wifi: row['WI-FI'] || "",
                    bluetooth: row['BLUETOOTH'] || "",
                    color: row['COLOR'] || row['COLOR '] || "",
                    estetica: row['OBSERVACIONES DE ESTÉTICA'] || "",
                    comentarios: row['COMENTARIOS '] || row['COMENTARIOS'] || row['COMMENT'] || "",
                    os: row['O. SYSTEM'] || "",
                    licencia: row['LICENCIA'] || "",
                    cliente: row['CLIENTE'] || row['CLIENTE '] || "",
                    fechaEntrega: procesarFechaExcel(row['FECHA ENTREGA'] || row['FECHA Y HORA DE ENTREGA']),
                    fechaPago: procesarFechaExcel(row['FECHA DE PAGO']),
                    ultimaSincronizacion: new Date()
                };

                currentBatch.set(docRef, dataMapeada, { merge: true });
                operationCount++;
                registrosProcesados++;

                if (operationCount >= 490) {
                    await currentBatch.commit();
                    await new Promise(r => setTimeout(r, 150));
                    currentBatch = writeBatch(db);
                    operationCount = 0;
                }
            }

            if (operationCount > 0) {
                await currentBatch.commit();
            }

            modalCarga.hide();

            console.log("Importacion exitosa. Se procesaron " + registrosProcesados + " registros (Nuevos y Actualizados).");
            inputFileExcel.value = "";

            await Swal.fire({
                title: "¡Importación Exitosa!",
                text: `Se procesaron y actualizaron los ${registrosProcesados} equipos correctamente.`,
                icon: "success"
            });
            setTimeout(() => {
                cargarInventario('inicio', true);
            }, 1000);

        } catch (error) {
            modalCarga.hide();
            console.error("Error al procesar el Excel", error);
            await Swal.fire({
                title: "Error de Importación",
                text: "Hubo un problema procesando el archivo. Revisa el formato.",
                icon: "error"
            });
            setTimeout(() => {
                cargarInventario('inicio', true);
            }, 1000);
        }
    };

    reader.readAsArrayBuffer(file);
});

function actualizarEstadisticas() {
    try {
        let countTotal = window.inventarioGlobal.length;
        let countVendidos = 0, countAlmacen = 0, countGarantia = 0, countPiezas = 0, countHabilitar = 0, countProceso = 0, countRemate = 0;

        (window.inventarioGlobal || []).forEach(d => {
            const est = String(d.estatus || '').trim().toLowerCase();
            const cond = String(d.condicion || '').trim().toLowerCase();

            if (['vendido'].includes(est)) countVendidos++;
            else if (['almacén', 'almacen'].includes(est)) countAlmacen++;
            else if (['en garantía', 'en garantia'].includes(est)) countGarantia++;
            else if (['falta pza'].includes(est)) countPiezas++;
            else if (['por habilitar'].includes(est)) countHabilitar++;
            else if (['proceso'].includes(est)) countProceso++;

            if (['remate'].includes(cond)) countRemate++;
        });

        document.getElementById('kpiTotal').innerText = countTotal + " Pieza(s)";
        document.getElementById('kpiVendidos').innerText = countVendidos + " Pieza(s)";
        document.getElementById('kpiAlmacen').innerText = countAlmacen + " Pieza(s)";
        document.getElementById('kpiProceso').innerText = countProceso + " Pieza(s)";
        document.getElementById('kpiGarantia').innerText = countGarantia + " Pieza(s)";
        document.getElementById('kpiPiezas').innerText = countPiezas + " Pieza(s)";
        document.getElementById('kpiHabilitar').innerText = countHabilitar + " Pieza(s)";
        document.getElementById('kpiRemate').innerText = countRemate + " Pieza(s)";

    } catch (error) {
        console.error("Error al cargar KPIs:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarInventario();

    const regTipoClienteCoti = document.getElementById('regTipoClienteCoti');
    if (regTipoClienteCoti) {
        regTipoClienteCoti.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const rows = document.querySelectorAll('#tablaItemsCoti tbody tr');
            rows.forEach(row => {
                const precioMayorista = parseFloat(row.getAttribute('data-precio-mayorista')) || 0;
                const precioPublico = parseFloat(row.getAttribute('data-precio-publico')) || 0;
                if (row.hasAttribute('data-precio-publico')) {
                    const inputCosto = row.querySelector('.coti-costo');
                    if (inputCosto) {
                        inputCosto.value = tipo === 'mayorista' ? (precioMayorista || precioPublico || 0) : (precioPublico || precioMayorista || 0);
                    }
                }
            });
        });
    }

    const regTipoClienteNota = document.getElementById('regTipoClienteNota');
    if (regTipoClienteNota) {
        regTipoClienteNota.addEventListener('change', (e) => {
            const tipo = e.target.value;
            const rows = document.querySelectorAll('#tablaItemsNota tbody tr');
            rows.forEach(row => {
                const precioMayorista = parseFloat(row.getAttribute('data-precio-mayorista')) || 0;
                const precioPublico = parseFloat(row.getAttribute('data-precio-publico')) || 0;
                if (row.hasAttribute('data-precio-publico')) {
                    const inputCosto = row.querySelector('.coti-costo');
                    if (inputCosto) {
                        inputCosto.value = tipo === 'mayorista' ? (precioMayorista || precioPublico || 0) : (precioPublico || precioMayorista || 0);
                    }
                }
            });
        });
    }
});

window.eliminarRegistro = async (serie) => {
    const confirmacion = await Swal.fire({
        title: "Eliminar Registro",
        text: `ALERTA: ¿Estás seguro de que deseas eliminar permanentemente el equipo con serie ${serie}? Esta acción no se puede deshacer.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, Eliminar",
        cancelButtonText: "Cancelar"
    });
    if (confirmacion.isConfirmed) {
        try {
            modalLoading.show();
            await deleteDoc(doc(db, "almacen", serie));

            window.inventarioGlobal = (window.inventarioGlobal || []).filter(item => item.serie !== serie);

            await Swal.fire({
                title: "Eliminado",
                text: `El equipo ${serie} fue eliminado.`,
                icon: "success"
            });
            cargarInventario('inicio', false);
        } catch (error) {
            console.error("Error al eliminar:", error);
            await Swal.fire({
                title: "Error",
                text: "No se pudo eliminar el registro.",
                icon: "error"
            });
        } finally {
            modalLoading.hide();
        }
    }
};

window.ordenStockCriterio = 'existencia';
window.ordenStockCatDir = 'asc';

window.aplicarOrdenamientoModelos = () => {
    if (!window.modelosAgrupadosCache) return;

    if (window.ordenStockCriterio === 'categoria') {
        const dir = window.ordenStockCatDir === 'asc' ? 1 : -1;
        window.modelosAgrupadosCache.sort((a, b) => {
            const catA = String(a.categoria || '').trim();
            const catB = String(b.categoria || '').trim();
            const resCat = catA.localeCompare(catB, 'es', { sensitivity: 'base' });
            if (resCat !== 0) return resCat * dir;
            if (b.existencia !== a.existencia) return b.existencia - a.existencia;
            return a.marcaModelo.localeCompare(b.marcaModelo, 'es', { sensitivity: 'base' });
        });
    } else {
        window.modelosAgrupadosCache.sort((a, b) => {
            if (b.existencia !== a.existencia) return b.existencia - a.existencia;
            return a.marcaModelo.localeCompare(b.marcaModelo, 'es', { sensitivity: 'base' });
        });
    }
};

window.actualizarUIOrdenCategoria = () => {
    const btn = document.getElementById('btnOrdenarCategoriaStock');
    const iconoBtn = document.getElementById('iconoOrdenCategoriaStock');
    const thIcono = document.getElementById('thIconoOrdenCatStock');

    if (window.ordenStockCriterio === 'categoria') {
        if (btn) {
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-dark');
        }
        if (window.ordenStockCatDir === 'asc') {
            if (iconoBtn) iconoBtn.className = 'bi bi-sort-alpha-down';
            if (thIcono) thIcono.className = 'bi bi-sort-alpha-down ms-1 small text-success';
        } else {
            if (iconoBtn) iconoBtn.className = 'bi bi-sort-alpha-up-alt';
            if (thIcono) thIcono.className = 'bi bi-sort-alpha-up-alt ms-1 small text-success';
        }
    } else {
        if (btn) {
            btn.classList.remove('btn-dark');
            btn.classList.add('btn-outline-secondary');
        }
        if (iconoBtn) iconoBtn.className = 'bi bi-arrow-down-up';
        if (thIcono) thIcono.className = 'bi bi-arrow-down-up ms-1 small text-muted';
    }
};

window.toggleOrdenCategoriaStock = () => {
    if (window.ordenStockCriterio !== 'categoria') {
        window.ordenStockCriterio = 'categoria';
        window.ordenStockCatDir = 'asc';
    } else if (window.ordenStockCatDir === 'asc') {
        window.ordenStockCatDir = 'desc';
    } else {
        window.ordenStockCriterio = 'existencia';
        window.ordenStockCatDir = 'asc';
    }
    window.actualizarUIOrdenCategoria();
    window.aplicarOrdenamientoModelos();
    const buscador = document.getElementById('buscadorModelos');
    window.renderizarTablaModelos(buscador ? buscador.value : '');
};

window.abrirResumenModelos = async (forzarModal = true) => {
    try {
        modalLoading.show();

        await new Promise(resolve => setTimeout(resolve, 300));

        if (forzarModal) {
            const selectCat = document.getElementById('filtroCategoriaStock');
            const selectCond = document.getElementById('filtroCondicionStock');
            if (selectCat) selectCat.value = '';
            if (selectCond) selectCond.value = '';
            const buscador = document.getElementById('buscadorModelos');
            if (buscador) buscador.value = '';
        }

        const catFiltro = document.getElementById('filtroCategoriaStock') ? document.getElementById('filtroCategoriaStock').value.trim().toUpperCase() : '';
        const condFiltro = document.getElementById('filtroCondicionStock') ? document.getElementById('filtroCondicionStock').value.trim().toUpperCase() : '';
        const conteoAgrupado = {};

        const normalizarCondicionLocal = (cond) => {
            const c = String(cond || '').trim().toLowerCase();
            if (c === 'nuevo') return 'NUEVO';
            if (c === 'seminuevo' || c === 'semi-nuevo') return 'SEMINUEVO';
            if (c === 'usado') return 'USADO';
            if (c === 'refurbished' || c === 'refur' || c === 'reconstruido') return 'REFURBISHED';
            if (c === 'remate') return 'REMATE';
            return 'NO DEFINIDA';
        };

        window.inventarioGlobal.forEach(d => {
            const categoria = String(d.categoria || '').trim().toUpperCase();
            if (catFiltro !== '' && categoria !== catFiltro) return;
            const condicion = normalizarCondicionLocal(d.condicion);
            if (condFiltro !== '' && condicion !== condFiltro) return;

            const marca = String(d.marca || 'Sin Marca').trim().toUpperCase();
            const modelo = String(d.modelo || 'Sin Modelo').trim().toUpperCase();
            const procesador = String(d.procesador || 'Sin Procesador').trim().toUpperCase();
            const generacion = String(d.generacion || 'Sin Generacion').trim().toUpperCase();
            const ram = String(d.ram || 'Sin RAM').trim().toUpperCase();
            const tipoRam = String(d.tipoRam || 'Sin Tipo RAM').trim().toUpperCase();
            const ssd = String(d.ssd || 'No').trim().toUpperCase();
            const hdd = String(d.hdd || 'No').trim().toUpperCase();
            const estatus = String(d.estatus || '').trim().toLowerCase();

            const almacenamiento = `SSD: ${ssd} / HDD: ${hdd}`;
            const llave = `${categoria}|${marca} ${modelo}|${procesador}|${generacion}|${ram}|${tipoRam}|${almacenamiento}|${condicion}`;

            if (!conteoAgrupado[llave]) {
                conteoAgrupado[llave] = {
                    llave: llave,
                    marcaModelo: `${marca} ${modelo}`,
                    categoria: d.categoria || 'N/A',
                    procesador: procesador,
                    generacion: generacion,
                    ram: ram,
                    tipoRam: tipoRam,
                    almacenamiento: almacenamiento,
                    condicion: condicion,
                    existencia: 0,
                    vendidos: 0,
                    total: 0,
                    series: [],
                    productoId: d.productoId || null
                };
            } else if (!conteoAgrupado[llave].productoId && d.productoId) {
                conteoAgrupado[llave].productoIds = d.productoIds;
            }

            conteoAgrupado[llave].total++;
            conteoAgrupado[llave].series.push(d.serie);

            if (estatus === 'vendido') {
                conteoAgrupado[llave].vendidos++;
            } else if (estatus === 'almacén' || estatus === 'almacen') {
                conteoAgrupado[llave].existencia++;
            }
        });

        window.modelosAgrupadosCache = Object.values(conteoAgrupado).filter(item => item.existencia > 0);
        window.aplicarOrdenamientoModelos();
        window.actualizarUIOrdenCategoria();

        const buscador = document.getElementById('buscadorModelos');
        const valorBusqueda = buscador ? buscador.value : '';

        window.renderizarTablaModelos(valorBusqueda);

        if (!window.listaProductosTienda || !window.opcionesProductosTienda) {
            await window.cargarProductosTiendaCache();
        }

        modalLoading.hide();
        if (forzarModal) {
            const modalResumen = new bootstrap.Modal(document.getElementById('modalResumenModelos'));
            modalResumen.show();
        }

    } catch (error) {
        modalLoading.hide();
        console.error("Error al generar el conteo de modelos:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al generar el resumen.",
            icon: "error"
        });
    }
};

window.cargarProductosTiendaCache = async (forzarRecarga = false) => {
    if (!window.listaProductosTienda || forzarRecarga) {
        const snapProd = await getDocs(collection(db, "productos"));
        window.opcionesProductosTienda = {};
        window.listaProductosTienda = [];

        snapProd.forEach(docP => {
            const data = docP.data() || {};
            const nombre = String(data.nombre || data.modelo || 'Sin Nombre').trim();
            const procesador = String(data.procesador || '').trim();
            const procesadorLabel = procesador ? ` - (CPU: ${procesador})` : '';
            const categoria = String(data.categoria || '').trim();
            const codigo = String(data.codigo || '').trim();
            const ddrRam = String(data.ddrRam || '').trim();
            const ram = String(data.ram || '').trim();
            const graficos = String(data.graficos || '').trim();
            const estado = String(data.estado || '').trim();
            const almacenamiento = String(data.espacio || '').trim();
            const marca = String(data.marca || '').trim();

            const label = `${nombre}${procesadorLabel}`.trim();
            window.opcionesProductosTienda[docP.id] = label;

            // Texto normalizado para búsqueda flexible multi-palabra
            const busquedaTexto = `${nombre} ${procesador} ${categoria} ${codigo} ${ram} ${almacenamiento} ${marca} ${docP.id}`
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");

            window.listaProductosTienda.push({
                id: docP.id,
                nombre: nombre,
                procesador: procesador,
                graficos: graficos,
                categoria: categoria,
                codigo: codigo,
                ram: ram,
                ddrRam: ddrRam,
                estado: estado,
                almacenamiento: almacenamiento,
                marca: marca,
                label: label,
                busquedaTexto: busquedaTexto
            });
        });

        // Ordenar alfabéticamente
        window.listaProductosTienda.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    return window.listaProductosTienda;
};

window.renderizarTablaModelos = (filtro) => {
    const cuerpoTablaModelos = document.getElementById('cuerpoTablaModelos');
    if (!cuerpoTablaModelos) return;
    cuerpoTablaModelos.innerHTML = '';

    const terminos = filtro.trim().toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const filtrados = (window.modelosAgrupadosCache || []).filter(item => {
        if (terminos.length === 0) return true;

        const ramRaw = String(item.ram || '').toLowerCase();
        const ramSinEspacios = ramRaw.replace(/\s+/g, '');
        const textoCompleto = `${item.marcaModelo || ''} ${item.categoria || ''} ${item.procesador || ''} ${item.generacion || ''} ${ramRaw} ${ramSinEspacios} ${item.tipoRam || ''} ${item.almacenamiento || ''} ${item.condicion || ''}`.toLowerCase();

        return terminos.every(t => textoCompleto.includes(t));
    });

    const badgeCondicion = (condicion) => {
        const cond = condicion.toLowerCase();
        if (cond === 'seminuevo') return '<span class="badge bg-light text-secondary">Seminuevo</span>';
        if (cond === 'nuevo') return '<span class="badge bg-primary-subtle text-primary">Nuevo</span>';
        if (cond === 'refurbished') return '<span class="badge bg-danger-subtle text-danger">Refurbished</span>';
        if (cond === 'remate') return '<span class="badge bg-dark-subtle text-dark">Remate</span>';
        return '<span class="badge bg-secondary-subtle text-secondary">' + condicion + '</span>';
    }

    if (filtrados.length === 0) {
        cuerpoTablaModelos.innerHTML = '<tr style="cursor: default !important;"><td colspan="7" class="text-center text-muted p-3">No se encontraron coincidencias.</td></tr>';
    } else {
        filtrados.forEach(item => {

            cuerpoTablaModelos.innerHTML += `
                <tr style="cursor: default !important;">
                    <td>${item.marcaModelo} <br><small class="text-muted">${item.categoria || ''}</small></td>
                    <td>${item.procesador || ''} <br><small class="text-muted">${item.generacion}</small></td>
                    <td class="text-center">${item.ram} ${item.tipoRam}</td>
                    <td class="text-center">${item.almacenamiento}</td>
                    <td class="text-center">${badgeCondicion(item.condicion)}</td>
                    <td class="text-center"><span class="badge bg-success-subtle text-success fs-6">${item.existencia}</span></td>
                    <td class="text-center"><span class="badge bg-primary-subtle text-primary">${item.vendidos}</span></td>
                    <td class="text-center">
                        <button class="btn-vincular btn btn-sm btn-light text-secondary shadow-sm rounded-pill" onclick="vincularGrupoCatalogo('${item.llave}')" title="Vincular a Tienda">
                            <i class="fa-solid fa-link"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
};

window.vincularGrupoCatalogo = async (llave) => {
    const grupo = window.modelosAgrupadosCache.find(g => g.llave === llave);
    if (!grupo || grupo.series.length === 0) return;

    const seriesParaVincular = window.inventarioGlobal.filter(item => grupo.series.includes(item.serie) &&
        (item.estatus.toLowerCase() === 'almacén' ||
            item.estatus.toLowerCase() === 'almacen' ||
            item.estatus.toLowerCase() === 'por habilitar')).map(item => item.serie);

    if (seriesParaVincular.length === 0) {
        return Swal.fire('Sin Stock', 'No hay equipos disponibles en almacén para este modelo', 'info');
    }

    if (!window.listaProductosTienda || window.listaProductosTienda.length === 0) {
        modalLoading.show();
        await window.cargarProductosTiendaCache();
        modalLoading.hide();
    }
    const productos = window.listaProductosTienda || [];

    const normalizar = (txt) => String(txt || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const tokensMarcaModelo = normalizar(grupo.marcaModelo).split(/\s+/).filter(t => t.length > 0);

    let busquedaInicial = '';
    if (tokensMarcaModelo.length > 0) {
        const coincidenciaCompleta = productos.some(p => tokensMarcaModelo.every(t => p.busquedaTexto.includes(t)));
        if (coincidenciaCompleta) {
            busquedaInicial = grupo.marcaModelo;
        } else if (tokensMarcaModelo.length >= 2) {
            const tokensCortos = tokensMarcaModelo.slice(0, 2);
            if (productos.some(p => tokensCortos.every(t => p.busquedaTexto.includes(t)))) {
                busquedaInicial = tokensCortos.join(' ');
            }
        }
    }

    // CARGAR SELECCIONES PREVIAS SI EXISTEN (Para multi-link)
    let idsIniciales = [];
    if (grupo.productoIds && Array.isArray(grupo.productoIds)) {
        idsIniciales = [...grupo.productoIds];
    } else if (grupo.productoId) {
        idsIniciales = [grupo.productoId];
    }
    let productosSeleccionados = productos.filter(p => idsIniciales.includes(p.id));

    const modalResumenEl = document.getElementById('modalResumenModelos');
    if (modalResumenEl) {
        modalResumenEl.removeAttribute('tabindex');
    }

    const { value: productosIdsGuardar } = await Swal.fire({
        target: modalResumenEl || 'body',
        title: '<i class="fa-solid fa-link text-success me-2"></i>Vincular al Catálogo',
        width: '680px',
        customClass: {
            container: 'swal-vincular-container',
            popup: 'swal-vincular-modal shadow-lg',
            confirmButton: 'btn btn-success px-4 py-2 m-2 rounded-pill fw-semibold shadow-sm',
            cancelButton: 'btn btn-outline-secondary px-4 py-2 rounded-pill fw-semibold'
        },
        buttonsStyling: false,
        html: `
            <div class="text-start mb-3">
                <div class="p-2 px-3 rounded-3 bg-light border border-primary border-opacity-25 d-flex align-items-center justify-content-between mb-3">
                    <div class="overflow-hidden me-2">
                        <div class="fw-bold text-dark text-truncate" style="font-size: 0.95rem;">
                            <i class="fa-solid fa-laptop text-success me-1"></i> ${grupo.marcaModelo} <span class="text-secondary">(${grupo.condicion})</span>
                        </div>
                        <div class="text-secondary small text-truncate" style="font-size: 12px;">
                            <span><i class="fa-solid fa-microchip me-1"></i>${grupo.procesador || 'Sin CPU'}</span>
                            ${grupo.ram ? ` &bull; <span>${grupo.ram} ${grupo.tipoRam || ''}</span>` : ''}
                            ${grupo.almacenamiento && grupo.almacenamiento !== 'N/A' ? ` &bull; <span>${grupo.almacenamiento}</span>` : ''}
                            ${grupo.categoria && grupo.categoria !== 'N/A' ? ` &bull; <span class="badge bg-secondary-subtle text-secondary">${grupo.categoria}</span>` : ''}
                        </div>
                    </div>
                    <span class="badge bg-success-subtle text-success rounded-pill px-3 py-2 text-nowrap">${seriesParaVincular.length} en stock</span>
                </div>

                <label class="form-label small fw-bold text-secondary mb-1">
                    <i class="fa-solid fa-magnifying-glass text-secondary me-1"></i> Buscar productos en la tienda (Puedes seleccionar múltiples):
                </label>
                <div class="input-group shadow-sm mb-1">
                    <span class="input-group-text bg-white border-end-0 text-muted"><i class="fa-solid fa-search"></i></span>
                    <input type="text" id="swalBuscadorProducto" class="form-control border-start-0 border-end-0 ps-1" 
                           placeholder="Escribe marca, modelo o procesador..." value="${busquedaInicial}" autocomplete="off">
                    <button class="btn btn-white border-secondary border-opacity-25 border-start-0" type="button" id="swalBtnLimpiarBusqueda" title="Limpiar buscador">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <div class="d-flex justify-content-between align-items-center px-1 mb-2">
                    <small id="swalContadorCoincidencias" class="text-muted fw-semibold" style="font-size: 0.78rem;">Buscando...</small>
                    <small class="text-muted" style="font-size: 0.78rem;"><i class="fa-solid fa-hand-pointer me-1"></i>Clic para agregar/quitar</small>
                </div>

                <div id="swalBannerSeleccionado" class="alert alert-success d-flex align-items-center justify-content-between py-2 px-3 mb-2 rounded-3" style="display: ${productosSeleccionados.length > 0 ? 'flex' : 'none'};">
                    <div class="text-start overflow-hidden me-2">
                        <div class="small fw-bold text-success text-truncate" id="swalTextoNombreSeleccionado">${productosSeleccionados.map(p => p.nombre).join(', ')}</div>
                        <div class="text-secondary text-truncate" style="font-size: 0.75rem;" id="swalTextoDetalleSeleccionado">${productosSeleccionados.length} producto(s) vinculado(s)</div>
                    </div>
                    <span class="badge bg-success text-white text-nowrap"><i class="fa-solid fa-circle-check me-1"></i>Multi-Link</span>
                </div>

                <div id="swalListaSugerencias" class="list-group swal-sugerencias-lista shadow-sm">
                    <!-- Sugerencias dinámicas -->
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Vínculos',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        willClose: () => {
            if (modalResumenEl) {
                modalResumenEl.setAttribute('tabindex', '-1');
            }
        },
        didOpen: (modalElement) => {
            const inputBuscador = modalElement.querySelector('#swalBuscadorProducto');
            const btnLimpiar = modalElement.querySelector('#swalBtnLimpiarBusqueda');
            const contenedorLista = modalElement.querySelector('#swalListaSugerencias');
            const contadorCoincidencias = modalElement.querySelector('#swalContadorCoincidencias');
            const bannerSeleccionado = modalElement.querySelector('#swalBannerSeleccionado');
            const textoNombreSeleccionado = modalElement.querySelector('#swalTextoNombreSeleccionado');
            const textoDetalleSeleccionado = modalElement.querySelector('#swalTextoDetalleSeleccionado');

            if (inputBuscador) {
                inputBuscador.addEventListener('click', (e) => e.stopPropagation());
                inputBuscador.addEventListener('focus', (e) => e.stopPropagation());
            }

            const resaltarCoincidencias = (texto, terminos) => {
                if (!terminos || terminos.length === 0 || !texto) return texto || '';
                let resultado = String(texto);
                terminos.forEach(term => {
                    if (term.length < 2) return;
                    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
                    resultado = resultado.replace(regex, '<mark>$1</mark>');
                });
                return resultado;
            };

            const seleccionarProducto = (prod) => {
                if (!prod) return;
                const index = productosSeleccionados.findIndex(p => p.id === prod.id);
                if (index > -1) {
                    productosSeleccionados.splice(index, 1); // Quitar si ya existe
                } else {
                    productosSeleccionados.push(prod); // Agregar
                }

                if (productosSeleccionados.length > 0) {
                    textoNombreSeleccionado.textContent = productosSeleccionados.map(p => p.nombre).join(', ');
                    textoDetalleSeleccionado.textContent = `${productosSeleccionados.length} producto(s) vinculado(s)`;
                    bannerSeleccionado.style.display = 'flex';
                } else {
                    bannerSeleccionado.style.display = 'none';
                }

                // Actualizar la vista visualmente sin re-renderizar todo
                const items = contenedorLista.querySelectorAll('.sugerencia-producto-item');
                items.forEach(el => {
                    const elId = el.getAttribute('data-id');
                    const icono = el.querySelector('.indicador-seleccion');
                    if (productosSeleccionados.some(p => p.id === elId)) {
                        el.classList.add('selected');
                        if (icono) icono.className = 'fa-solid fa-circle-check text-primary fs-5 indicador-seleccion';
                    } else {
                        el.classList.remove('selected');
                        if (icono) icono.className = 'fa-regular fa-circle text-muted fs-5 indicador-seleccion';
                    }
                });
            };

            const renderizarSugerencias = (filtro) => {
                const query = normalizar(filtro);
                const terminos = query.split(/\s+/).filter(t => t.length > 0);

                let filtrados = productos;
                if (terminos.length > 0) {
                    filtrados = productos.filter(p => terminos.every(t => p.busquedaTexto.includes(t)));
                }

                contadorCoincidencias.innerHTML = `${filtrados.length} ${filtrados.length === 1 ? 'sugerencia encontrada' : 'sugerencias encontradas'}`;

                if (filtrados.length === 0) {
                    contenedorLista.innerHTML = `
                        <div class="p-4 text-center text-muted">
                            <i class="fa-solid fa-circle-question fs-3 text-secondary d-block mb-2"></i>
                            <div class="fw-semibold">No se encontraron modelos coincidentes</div>
                            <small class="text-muted">Prueba buscando con menos palabras clave o haz clic en la "X" para limpiar.</small>
                        </div>
                    `;
                    return;
                }

                const itemsAMostrar = filtrados.slice(0, 60);

                contenedorLista.innerHTML = itemsAMostrar.map(p => {
                    const isSelected = productosSeleccionados.some(sel => sel.id === p.id);
                    const nombreResaltado = resaltarCoincidencias(p.nombre, terminos);
                    const cpuResaltado = p.procesador ? resaltarCoincidencias(p.procesador, terminos) : '';

                    const obtenerNombreCategoria = (nombre) => {
                        switch (nombre) {
                            case 'lap': return 'Laptop';
                            case 'lapApple': return 'Apple';
                            case 'table': return 'TABLET';
                            case 'pc': return 'PC Completa';
                            case 'cpu': return 'Solo CPU';
                            case 'docking': return 'Docking';
                            case 'aio': return 'All in One';
                            case 'workLap': return 'Workstation Lap';
                            case 'workServ': return 'Workstation & Server';
                            case 'monitor': return 'Monitor';
                            case 'proyectores': return 'Proyector';
                            default: return nombre;
                        }
                    };

                    const obtenerNombreGraficos = (nombre) => {
                        switch (nombre) {
                            case 't2000': return 'Nvidia Quadro T2000';
                            case 't1000': return 'Nvidia Quadro T1000';
                            case 't1200': return 'Nvidia Quadro T1200';
                            case 't600': return 'Nvidia Quadro T600';
                            case 'p4000': return 'Nvidia Quadro P4000';
                            case 'rtxA3000': return 'Nvidia RTX A3000';
                            case 'rtx3000': return 'Nvidia RTX 3000';
                            case 'rtx5000': return 'Nvidia RTX 5000';
                            case 'arc-pro-140t': return 'Intel Arc Pro 140T';
                            default: return nombre;
                        }
                    };

                    const obtenerNombreCondicion = (nombre) => {
                        switch (nombre) {
                            case 'refur': return 'Refurbished';
                            case 'nuevo': return 'Nuevo';
                            case 'seminuevo': return 'Seminuevo';
                            case 'remate': return 'Remate';
                            default: return nombre;
                        }
                    };

                    const obtenerNombreProcesador = (nombre) => {
                        switch (nombre) {
                            case 'i5': return 'Intel Core i5';
                            case 'i7': return 'Intel Core i7';
                            case 'i9': return 'Intel Core i9';
                            case 'r5': return 'AMD Ryzen 5';
                            case 'r7': return 'AMD Ryzen 7';
                            case 'r9': return 'AMD Ryzen 9';
                            case 'ix-w': return 'Intel Xeon W';
                            case 'ix-bronze': return 'Intel Xeon Bronze';
                            default: return nombre;
                        }
                    };

                    return `
                        <div class="list-group-item sugerencia-producto-item d-flex align-items-center justify-content-between ${isSelected ? 'selected' : ''}" 
                             data-id="${p.id}" style="user-select: none; cursor:pointer;">
                            <div class="overflow-hidden me-2">
                                <div class="fw-semibold text-dark text-truncate" style="font-size: 0.9rem;">
                                    ${nombreResaltado} (${obtenerNombreCondicion(p.estado) || ''})
                                </div>
                                <div class="small text-muted text-truncate d-flex flex-wrap gap-1 align-items-center mt-1">
                                    ${obtenerNombreCategoria(p.categoria) ? `<span class="badge bg-light text-secondary border">${obtenerNombreCategoria(p.categoria)}</span>` : ''}
                                    ${obtenerNombreProcesador(p.procesador) ? `<span class="badge bg-secondary-subtle text-secondary"><i class="fa-solid fa-microchip me-1"></i>${obtenerNombreProcesador(cpuResaltado)}</span>` : ''}
                                    ${p.ram ? `<span class="badge bg-light text-muted border">${p.ram} ${p.ddrRam}</span>` : ''} 
                                    ${obtenerNombreGraficos(p.graficos) ? `<span class="badge bg-light text-muted border">${obtenerNombreGraficos(p.graficos)}</span>` : ''}
                                    ${p.almacenamiento ? `<span class="badge bg-light text-muted border">${p.almacenamiento}</span>` : ''}
                                </div>
                            </div>
                            <div class="ps-2">
                                <i class="${isSelected ? 'fa-solid fa-circle-check text-primary' : 'fa-regular fa-circle text-muted'} fs-5 indicador-seleccion"></i>
                            </div>
                        </div>
                    `;
                }).join('');

                contenedorLista.querySelectorAll('.sugerencia-producto-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const id = el.getAttribute('data-id');
                        seleccionarProducto(productos.find(p => p.id === id));
                    });
                });
            };

            inputBuscador.addEventListener('input', () => {
                renderizarSugerencias(inputBuscador.value);
            });

            btnLimpiar.addEventListener('click', () => {
                inputBuscador.value = '';
                inputBuscador.focus();
                renderizarSugerencias('');
            });

            inputBuscador.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const primerItem = contenedorLista.querySelector('.sugerencia-producto-item');
                    if (primerItem) {
                        const id = primerItem.getAttribute('data-id');
                        const prod = productos.find(p => p.id === id);
                        if (prod && !productosSeleccionados.some(sel => sel.id === id)) {
                            seleccionarProducto(prod); // Seleccionar el primero si le da Enter
                        }
                    }
                }
            });

            renderizarSugerencias(inputBuscador.value);

            setTimeout(() => {
                if (inputBuscador) {
                    inputBuscador.focus();
                    inputBuscador.select();
                }
            }, 60);
        },
        preConfirm: () => {
            if (productosSeleccionados.length === 0) {
                Swal.showValidationMessage('No has seleccionado ningún producto para vincular');
                return false;
            }
            return productosSeleccionados.map(p => p.id); // Devolvemos el array de IDs seleccionados
        }
    });

    if (productosIdsGuardar) {
        modalLoading.show();
        try {
            const batchSize = 450;
            for (let i = 0; i < seriesParaVincular.length; i += batchSize) {
                const chunk = seriesParaVincular.slice(i, i + batchSize);
                const currentBatch = writeBatch(db);

                chunk.forEach(serie => {
                    const docRef = doc(db, "almacen", serie);
                    currentBatch.update(docRef, {
                        productoId: productosIdsGuardar.length > 0 ? productosIdsGuardar[0] : null,
                        productoIds: productosIdsGuardar
                    });

                    const idx = window.inventarioGlobal.findIndex(item => item.serie === serie);
                    if (idx !== -1) {
                        window.inventarioGlobal[idx].productoId = productosIdsGuardar.length > 0 ? productosIdsGuardar[0] : null;
                        window.inventarioGlobal[idx].productoIds = productosIdsGuardar;
                    }
                });

                await currentBatch.commit();
            }

            modalLoading.hide();
            Swal.fire({
                title: '¡Vinculación Exitosa!',
                text: `Se vincularon ${productosIdsGuardar.length} producto(s) a ${seriesParaVincular.length} equipo(s).`,
                icon: 'success',
                timer: 3000
            });

            await window.sincronizarStockTienda(true);

        } catch (error) {
            modalLoading.hide();
            console.error('Error vinculando a Catálogo', error);
            Swal.fire('Error', "No se pudieron vincular los equipos", 'error');
        }
    }
};

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btnBuscarStock') {
        e.preventDefault();
        window.renderizarTablaModelos(document.getElementById('buscadorModelos').value);
    }
    const btnCat = e.target ? e.target.closest('#btnOrdenarCategoriaStock, #thMarcaModeloCategoriaStock') : null;
    if (btnCat) {
        e.preventDefault();
        window.toggleOrdenCategoriaStock();
    }
});

document.addEventListener('keypress', (e) => {
    if (e.target && e.target.id === 'buscadorModelos' && e.key === 'Enter') {
        e.preventDefault();
        window.renderizarTablaModelos(e.target.value);
    }
});

document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'buscadorModelos') {
        window.renderizarTablaModelos(e.target.value);
    }
});

document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'filtroCategoriaStock') {
        window.abrirResumenModelos(false);
    } else if (e.target && e.target.id === 'filtroCondicionStock') {
        window.abrirResumenModelos(false);
    }
});

window.abrirContenedorRegistros = async () => {
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) {
        await Swal.fire({
            title: "Contenedor Vacío",
            text: "El contenedor está vacío. Selecciona al menos un equipo en el inventario.",
            icon: "warning"
        });
        return;
    }

    try {
        modalLoading.show();
        let equipos = [];
        let total = 0;

        for (let serie of seleccionados) {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                equipos.push(d);
                total += Number(d.precioPublico) || 0;
            }
        }


        const cuerpoTabla = document.getElementById('cuerpoTablaContenedor');
        cuerpoTabla.innerHTML = '';

        equipos.forEach(d => {
            cuerpoTabla.innerHTML += `
                <tr>
                    <td><span class="badge bg-success-subtle text-success">${d.serie}</span></td>
                    <td><strong>${d.marca}</strong> ${d.modelo}</td>
                    <td>${d.procesador} | ${d.ram} | SSD: ${d.ssd || 'No'} / HDD: ${d.hdd || 'No'}</td>
                    <td>${d.estetica || "Excelente estado"}</td>
                    <td>$${Number(d.precioPublico).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="removerDelContenedor('${d.serie}', ${Number(d.precioPublico) || 0}, this)" title="Quitar equipo"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('totalContenedor').innerText = `$${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

        modalLoading.hide();
        const modalContenedor = new bootstrap.Modal(document.getElementById('modalContenedorRegistros'), {
            focus: false
        });
        modalContenedor.show();
    } catch (error) {
        modalLoading.hide();
        console.error("Error abriendo contenedor:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al cargar los datos del contenedor.",
            icon: "error"
        });
    }
};

window.vaciarContenedor = async () => {
    const confirmacion = await Swal.fire({
        title: "¿Vaciar Contenedor?",
        text: "¿Estás seguro de que deseas vaciar todos los registros seleccionados del contenedor?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, vaciar",
        cancelButtonText: "Cancelar"
    });
    if (confirmacion.isConfirmed) {
        window.seriesSeleccionadasGlobal.clear();
        window.seleccionGlobal = false;

        const checkboxes = document.querySelectorAll('.check-registro');
        checkboxes.forEach(cb => {
            cb.checked = false;
            const tr = cb.closest('tr');
            if (tr) {
                tr.style.backgroundColor = '';
                tr.style.removeProperty('--bs-table-bg');
                tr.style.color = '';
                tr.style.removeProperty('--bs-table-color');
                tr.style.removeProperty('--bs-table-striped-color');
                tr.style.removeProperty('--bs-table-hover-color');
            }
        });

        const chkSelectAll = document.getElementById('chkSelectAll');
        if (chkSelectAll) chkSelectAll.checked = false;

        window.verificarSeleccion();

        const modalEl = document.getElementById('modalContenedorRegistros');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }
    }
};

window.removerDelContenedor = (serie, precio, btnElement) => {
    window.seriesSeleccionadasGlobal.delete(serie);
    window.seleccionGlobal = false;

    const checkbox = document.querySelector(`.check-registro[value="${serie}"]`);
    if (checkbox) {
        checkbox.checked = false;
        const tr = checkbox.closest('tr');
        if (tr) {
            tr.style.backgroundColor = '';
            tr.style.removeProperty('--bs-table-bg');
            tr.style.color = '';
            tr.style.removeProperty('--bs-table-color');
            tr.style.removeProperty('--bs-table-striped-color');
            tr.style.removeProperty('--bs-table-hover-color');
        }
    }

    const chkSelectAll = document.getElementById('chkSelectAll');
    if (chkSelectAll) chkSelectAll.checked = false;

    window.verificarSeleccion();

    const row = btnElement.closest('tr');
    if (row) row.remove();

    const totalEl = document.getElementById('totalContenedor');
    let currentTotal = parseFloat(totalEl.innerText.replace(/[^0-9.-]+/g, "")) || 0;
    let newTotal = Math.max(0, currentTotal - precio);

    totalEl.innerText = `$${newTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

    if (window.seriesSeleccionadasGlobal.size === 0) {
        const modalEl = document.getElementById('modalContenedorRegistros');
        if (modalEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        }
    }
};

window.cambiarEstatusContenedor = async () => {
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) {
        Swal.fire("Sin Selección", "No hay equipos seleccionados en el contenedor.", "warning");
        return;
    }

    const { value: nuevoEstatus } = await Swal.fire({
        title: 'Cambiar Estatus',
        text: `Vas a cambiar el estatus de ${seleccionados.length} equipos del contenedor.`,
        input: 'select',
        inputOptions: {
            'Almacén': 'Almacén',
            'Proceso': 'Proceso',
            'Por habilitar': 'Por Habilitar',
            'Vendido': 'Vendido',
            'En garantía': 'En Garantía',
            'Falta pza': 'Falta Pieza(s)'
        },
        inputPlaceholder: 'Selecciona un estatus',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value) {
                return 'Debes seleccionar un estatus';
            }
        }
    });

    if (!nuevoEstatus) return;

    const estatusTrim = nuevoEstatus.trim();
    const estatusLower = estatusTrim.toLowerCase();

    const normalizarEstatus = (est) => {
        const e = String(est || '').trim().toLowerCase();
        if (e === 'almacén' || e === 'almacen') return 'almacen';
        if (e === 'en garantía' || e === 'en garantia') return 'en garantia';
        if (e === 'por habilitar') return 'por habilitar';
        if (e === 'falta pza' || e === 'falta pieza' || e === 'falta pieza(s)') return 'falta pza';
        return e;
    };

    const seleccionadosFiltrados = seleccionados.filter(serie => {
        const d = window.inventarioGlobal.find(item => item.serie === serie);
        if (!d) return true;
        return normalizarEstatus(d.estatus) !== normalizarEstatus(estatusTrim);
    });

    if (seleccionadosFiltrados.length === 0) {
        await Swal.fire({
            title: "Sin Cambios",
            text: "Todos los equipos del contenedor ya cuentan con el estatus indicado.",
            icon: "info"
        });
        return;
    }

    let equiposData = {};

    try {
        seleccionadosFiltrados.forEach(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                equiposData[serie] = d;
            }
        });
    } catch (error) {
        console.error("Error obteniendo datos del contenedor:", error);
    }

    let clienteVenta = "";
    let fechaEntregaMasiva = "";
    let fechaPagoMasiva = "";

    let mostrarPromptCliente = false;
    let mostrarPromptFechaEntrega = false;
    let mostrarPromptFechaPago = false;

    if (estatusTrim === 'Vendido' || estatusTrim === 'Proceso') {
        mostrarPromptCliente = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.cliente && String(d.cliente).trim() !== '' && String(d.cliente).trim().toLowerCase() !== 'sin asignar';
            return !tiene;
        });

        mostrarPromptFechaEntrega = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.fechaEntrega && String(d.fechaEntrega).trim() !== '';
            return !tiene;
        });
    }

    if (estatusTrim === 'Vendido') {
        mostrarPromptFechaPago = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.fechaPago && String(d.fechaPago).trim() !== '';
            return !tiene;
        });
    }

    if (mostrarPromptCliente) {
        const { value: inputCliente } = await Swal.fire({
            title: 'Cliente Requerido',
            text: `Por favor, ingresa el cliente para estos equipos en ${estatusTrim.toLowerCase()}:`,
            input: 'text',
            inputPlaceholder: 'Nombre del cliente',
            showCancelButton: true,
            confirmButtonText: (mostrarPromptFechaEntrega || mostrarPromptFechaPago) ? 'Siguiente' : 'Aceptar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'El nombre del cliente es obligatorio';
                }
            }
        });
        if (inputCliente === undefined) return;
        clienteVenta = inputCliente.trim();
    }

    if (mostrarPromptFechaEntrega) {
        const resultFechaEntrega = await Swal.fire({
            title: 'Fecha de Entrega',
            text: 'Ingresa la fecha de entrega para estos equipos:',
            input: 'date',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: mostrarPromptFechaPago ? 'Siguiente' : 'Aceptar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return 'La fecha de entrega es obligatoria';
                }
            }
        });
        if (resultFechaEntrega.dismiss) return;
        fechaEntregaMasiva = (resultFechaEntrega.value || '').trim();
    }

    if (mostrarPromptFechaPago) {
        const resultFechaPago = await Swal.fire({
            title: 'Fecha de Pago',
            text: 'Ingresa la fecha de pago para estos equipos vendidos:',
            input: 'date',
            inputValue: new Date().toISOString().split('T')[0],
            showCancelButton: true,
            confirmButtonText: 'Aceptar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value) {
                    return 'La fecha de pago es obligatoria';
                }
            }
        });
        if (resultFechaPago.dismiss) return;
        fechaPagoMasiva = (resultFechaPago.value || '').trim();
    }

    let motivo = "";
    let esteticaInput = "";
    const requiereMotivo = ['falta pza', 'en garantía', 'en garantia', 'por habilitar', 'almacén', 'almacen'].includes(estatusLower);
    const esGarantiaOPieza = ['en garantía', 'en garantia', 'falta pza', 'almacén', 'almacen'].includes(estatusLower);

    let algunSinComentarios = false;
    let algunSinEstetica = false;

    if (requiereMotivo) {
        seleccionadosFiltrados.forEach(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                const tieneComentarios = d.comentarios && String(d.comentarios).trim() !== '';
                const tieneEstetica = d.estetica && String(d.estetica).trim() !== '';
                if (!tieneComentarios) algunSinComentarios = true;
                if (!tieneEstetica) algunSinEstetica = true;
            } else {
                algunSinComentarios = true;
                algunSinEstetica = true;
            }
        });

        if (esGarantiaOPieza || algunSinComentarios) {
            const motivoResult = await Swal.fire({
                title: esGarantiaOPieza ? "Nuevos Comentarios Requeridos" : "Motivo del Movimiento",
                text: esGarantiaOPieza
                    ? `Vas a mover ${seleccionadosFiltrados.length} equipos a "${estatusTrim}". Por favor, ingresa los nuevos comentarios (reemplazarán los anteriores):`
                    : `Vas a mover ${seleccionadosFiltrados.length} equipos a "${estatusTrim}". Por favor, ingresa el motivo del movimiento:`,
                input: "text",
                showCancelButton: true,
                confirmButtonText: "Siguiente",
                cancelButtonText: "Cancelar",
                inputValidator: (value) => {
                    if (!value || value.trim() === '') {
                        return 'El motivo del movimiento es obligatorio';
                    }
                }
            });
            if (!motivoResult.isConfirmed) return;
            motivo = motivoResult.value.trim();
        }

        if (algunSinEstetica) {
            const esteticaResult = await Swal.fire({
                title: "Estética",
                text: "Por favor, ingresa un valor para la estética:",
                input: "text",
                showCancelButton: true,
                confirmButtonText: "Aceptar",
                cancelButtonText: "Cancelar",
                inputValidator: (value) => {
                    if (!value || value.trim() === '') {
                        return 'El valor de la estética es obligatorio';
                    }
                }
            });
            if (!esteticaResult.isConfirmed) return;
            esteticaInput = esteticaResult.value.trim();
        }
    }

    const hoyStr = new Date().toISOString().split('T')[0];
    const fechaManualResult = await Swal.fire({
        title: "Fecha del Movimiento",
        text: "Ingresa la fecha del movimiento (Formato AAAA-MM-DD):",
        input: "text",
        inputValue: hoyStr,
        showCancelButton: true,
        confirmButtonText: "Aceptar",
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
            if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
                return 'La fecha del movimiento es obligatoria en formato AAAA-MM-DD';
            }
        }
    });
    const fechaManual = fechaManualResult.isConfirmed ? (fechaManualResult.value || '') : null;
    if (fechaManual === null) return;

    const fechaParseada = new Date(fechaManual + "T00:00:00");
    if (isNaN(fechaParseada.getTime())) {
        await Swal.fire({
            title: "Acción Cancelada",
            text: "El formato de la fecha es inválido. Usa el formato AAAA-MM-DD.",
            icon: "error"
        });
        return;
    }

    let mostrarPromptTipoPrecio = false;
    if (estatusLower === 'proceso' || estatusLower === 'vendido') {
        mostrarPromptTipoPrecio = seleccionadosFiltrados.some(serie => {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            const tiene = d && d.tipoPrecioAbono && String(d.tipoPrecioAbono).trim() !== '';
            return !tiene;
        });
    }

    let tipoPrecio = null;
    if (mostrarPromptTipoPrecio) {
        const tipoPrecioResult = await Swal.fire({
            title: "Tipo de Precio / Cliente",
            text: "¿Qué tipo de precio/cliente aplica para estos productos?",
            input: "select",
            inputOptions: {
                "publico": "Precio Público",
                "mayorista": "Precio Mayorista"
            },
            inputPlaceholder: "Selecciona el tipo de precio",
            showCancelButton: true,
            confirmButtonText: "Aceptar",
            cancelButtonText: "Cancelar",
            inputValidator: (value) => {
                if (!value) {
                    return "Debes seleccionar un tipo de precio";
                }
            }
        });

        tipoPrecio = tipoPrecioResult.isConfirmed ? tipoPrecioResult.value : null;
        if (!tipoPrecio) return;
    }

    try {
        modalLoading.show();

        const batchSize = 490;
        for (let i = 0; i < seleccionadosFiltrados.length; i += batchSize) {
            const chunk = seleccionadosFiltrados.slice(i, i + batchSize);
            const currentBatch = writeBatch(db);

            chunk.forEach(serie => {
                if (!serie || serie === 'undefined') return;

                const docRef = doc(db, 'almacen', serie);
                const itemActual = window.inventarioGlobal.find(item => item.serie === serie) || {};

                const idsActualizar = itemActual.productoIds || (itemActual.productoId ? [itemActual.productoId] : []);
                if (idsActualizar.length > 0) {
                    const estPrevio = normalizarEstatus(itemActual.estatus);
                    const estNuevo = normalizarEstatus(estatusTrim);
                    const eraAlmacen = (estPrevio === 'almacen');
                    const esAlmacen = (estNuevo === 'almacen');

                    let delta = 0;
                    if (!eraAlmacen && esAlmacen) delta = 1;
                    else if (eraAlmacen && !esAlmacen) delta = -1;

                    if (delta !== 0) {
                        idsActualizar.forEach(id => {
                            const prodRef = doc(db, 'productos', id);
                            currentBatch.update(prodRef, { stock: increment(delta) });
                        });
                    }
                }

                const tieneComentarios = itemActual.comentarios && String(itemActual.comentarios).trim() !== '';
                const comentariosFinal = esGarantiaOPieza ? motivo : (tieneComentarios ? itemActual.comentarios : (motivo || ''));

                const tieneEstetica = itemActual.estetica && String(itemActual.estetica).trim() !== '';
                const esteticaFinal = tieneEstetica ? itemActual.estetica : (esteticaInput || '');

                const dataActualizacion = {
                    estatus: estatusTrim,
                    ultimoMovimiento: requiereMotivo ? (motivo ? motivo : (itemActual.comentarios || "Cambio de estatus desde contenedor")) : "Cambio de estatus desde contenedor",
                    fechaMovimiento: fechaParseada,
                    comentarios: comentariosFinal,
                    estetica: esteticaFinal
                };
                if (estatusLower === 'proceso' || estatusLower === 'vendido') {
                    const itemTieneTipoPrecio = itemActual.tipoPrecioAbono && String(itemActual.tipoPrecioAbono).trim() !== '';
                    dataActualizacion.tipoPrecioAbono = itemTieneTipoPrecio ? String(itemActual.tipoPrecioAbono).trim() : (tipoPrecio || '').trim();
                    dataActualizacion.tipoCliente = itemTieneTipoPrecio ? String(itemActual.tipoPrecioAbono).trim() : (tipoPrecio || '').trim();
                }

                const nuevoHistorial = window.procesarTransicionGarantia(itemActual, estatusTrim, fechaParseada, dataActualizacion.ultimoMovimiento, comentariosFinal);
                if (nuevoHistorial) {
                    dataActualizacion.historialGarantias = nuevoHistorial;
                }

                if (estatusTrim === 'Vendido' || estatusTrim === 'Proceso') {
                    const itemTieneCliente = itemActual.cliente && String(itemActual.cliente).trim() !== '' && String(itemActual.cliente).trim().toLowerCase() !== 'sin asignar';
                    dataActualizacion.cliente = itemTieneCliente ? String(itemActual.cliente).trim() : (clienteVenta || '').trim();

                    const itemTieneFechaEntrega = itemActual.fechaEntrega && String(itemActual.fechaEntrega).trim() !== '';
                    dataActualizacion.fechaEntrega = itemTieneFechaEntrega ? String(itemActual.fechaEntrega).trim() : (fechaEntregaMasiva || '').trim();
                }

                if (estatusTrim === 'Vendido') {
                    const itemTieneFechaPago = itemActual.fechaPago && String(itemActual.fechaPago).trim() !== '';
                    dataActualizacion.fechaPago = itemTieneFechaPago ? String(itemActual.fechaPago).trim() : (fechaPagoMasiva || '').trim();
                }

                if (estatusLower === 'almacén' || estatusLower === 'almacen') {
                    dataActualizacion.cliente = "";
                    dataActualizacion.fechaPago = "";
                    dataActualizacion.fechaEntrega = "";
                    dataActualizacion.historialAbonos = [];
                }

                currentBatch.update(docRef, dataActualizacion);

                const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
                if (index !== -1) {
                    window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...dataActualizacion };
                }
            });

            await currentBatch.commit();
            await new Promise(r => setTimeout(r, 150));
        }

        const modalContenedorEl = document.getElementById('modalContenedorRegistros');
        if (modalContenedorEl) {
            const modalInstance = bootstrap.Modal.getInstance(modalContenedorEl);
            if (modalInstance) modalInstance.hide();
        }

        modalLoading.hide();

        let generarNota = false;

        if (estatusTrim === 'Vendido' || estatusTrim === 'Proceso') {
            const esProceso = estatusTrim === 'Proceso';
            const tipoNotaLabel = esProceso ? 'nota de proceso' : 'nota de venta';
            const confirmacionNota = await Swal.fire({
                title: "Estatus Actualizado",
                text: `Se actualizó el estatus a "${nuevoEstatus}" para ${seleccionadosFiltrados.length} equipo(s). ¿Deseas generar la ${tipoNotaLabel} de los productos del contenedor?`,
                icon: "success",
                showCancelButton: true,
                confirmButtonText: "Sí, generar nota",
                cancelButtonText: "No, finalizar",
                allowOutsideClick: false
            });
            generarNota = confirmacionNota.isConfirmed;
        } else {
            Swal.fire("Estatus Actualizado", `Se actualizó el estatus a "${nuevoEstatus}" para ${seleccionadosFiltrados.length} equipo(s).`, "success");
        }

        if (generarNota) {
            window.esNotaProceso = (estatusTrim === 'Proceso');
            await window.contenedorRegistros();
        } else {
            window.seriesSeleccionadasGlobal.clear();
            window.seleccionGlobal = false;
            const chkAll = document.getElementById('chkSelectAll');
            if (chkAll) chkAll.checked = false;
            verificarSeleccion();
        }

        cargarInventario('inicio', false);
    } catch (error) {
        console.error("Error al actualizar estatus desde contenedor:", error);
        Swal.fire("Error", "Ocurrió un error al intentar cambiar el estatus.", "error");
    } finally {
        modalLoading.hide();
    }
};

window.contenedorRegistros = async () => {
    window.ultimoOrigenModal = null;
    const esNotaProceso = !!window.esNotaProceso;
    window.esNotaProceso = false;

    const modalCrearNotaVentaEl = document.getElementById('modalCrearNotaVenta');
    if (modalCrearNotaVentaEl) {
        modalCrearNotaVentaEl.setAttribute('data-tipo-nota', esNotaProceso ? 'proceso' : 'venta');
    }

    const tituloModal = document.getElementById('tituloModalNota');
    if (tituloModal) {
        tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Crear ${esNotaProceso ? 'Nota de Proceso' : 'Nota de Venta'}`;
    }

    const lblTituloNotaEquipos = document.getElementById('lblTituloNotaEquipos');
    if (lblTituloNotaEquipos) {
        lblTituloNotaEquipos.innerText = esNotaProceso ? 'Nota de Proceso de Equipos o Servicios' : 'Nota de Venta de Equipos o Servicios';
    }

    const btnGenerarPDFNotaFinal = document.getElementById('btnGenerarPDFNotaFinal');
    if (btnGenerarPDFNotaFinal) {
        btnGenerarPDFNotaFinal.innerHTML = `<i class="bi bi-file-pdf me-2"></i>Exportar ${esNotaProceso ? 'Nota de Proceso' : 'Nota de Venta'}`;
    }

    const btnGenerarCotizacionModal = document.getElementById('btnGenerarCotizacionModal');
    btnGenerarCotizacionModal.disabled = true;
    btnGenerarCotizacionModal.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Generando Nota...';

    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) {
        await Swal.fire({
            title: "Selección Requerida",
            text: "No hay equipos seleccionados para procesar.",
            icon: "warning"
        });
        btnGenerarCotizacionModal.disabled = false;
        btnGenerarCotizacionModal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>${esNotaProceso ? 'Nota de Proceso' : 'Nota de Venta'}`;
        return;
    }

    window.transaccionModoVender = false;
    window.equiposVentaPendientes = Array.from(seleccionados);

    modalLoading.show();
    let equipos = [];
    try {
        for (let serie of seleccionados) {
            const d = window.inventarioGlobal.find(item => item.serie === serie);
            if (d) {
                equipos.push(d);
            }
        }

    } catch (error) {
        modalLoading.hide();
        console.error("Error obteniendo datos:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al cargar los equipos.",
            icon: "error"
        });
        btnGenerarCotizacionModal.disabled = false;
        btnGenerarCotizacionModal.textContent = esNotaProceso ? 'Generar Nota de Proceso' : 'Generar Nota y Vender';
        return;
    }

    modalLoading.hide();

    if (equipos.length === 0) {
        await Swal.fire({
            title: "Sin Resultados",
            text: "No se encontraron datos para los equipos seleccionados.",
            icon: "warning"
        });
        btnGenerarCotizacionModal.disabled = false;
        btnGenerarCotizacionModal.textContent = esNotaProceso ? 'Generar Nota de Proceso' : 'Generar Nota y Vender';
        return;
    }

    let nextFolioNum = 900;
    try {
        const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
        const snapCoti = await getDocs(q);
        if (!snapCoti.empty) {
            nextFolioNum = snapCoti.docs[0].data().folioNum + 1;
        }
    } catch (err) {
        console.error("Error obteniendo número de folio:", err);
    }

    document.getElementById('regFolioNota').value = `PRO-${nextFolioNum}`;
    document.getElementById('regFolioNota').setAttribute('data-folionum', nextFolioNum);
    document.getElementById('regFechaNota').value = new Date().toISOString().split('T')[0];

    let clienteSugerido = "";
    if (equipos.length > 0) {
        clienteSugerido = equipos[0].cliente || "";
        if (clienteSugerido.toLowerCase() === 'sin asignar') clienteSugerido = "";
    }
    document.getElementById('regClienteNota').value = clienteSugerido;
    document.getElementById('regTelefonoNota').value = "";
    document.getElementById('regEmailNota').value = "";
    document.getElementById('regTipoClienteNota').value = "publico";
    document.getElementById('iva0Nota').checked = true;

    tablaItemsNotaBody.innerHTML = '';
    const gruposNota = {};
    equipos.forEach(item => {
        const cat = String(item.categoria || '').trim().toUpperCase();
        const marca = String(item.marca || '').trim().toUpperCase();
        const modelo = String(item.modelo || '').trim().toUpperCase();
        const procesador = String(item.procesador || '').trim().toUpperCase();
        const generacion = String(item.generacion || '').trim().toUpperCase();
        const ram = String(item.ram || '').trim().toUpperCase();
        const ssd = String(item.ssd || '').trim().toUpperCase();
        const hdd = String(item.hdd || '').trim().toUpperCase();
        const os = String(item.os || '').trim().toUpperCase();
        const precioMayorista = Number(item.precioMayorista) || 0;
        const precioPublico = Number(item.precioPublico) || 0;

        const key = `${cat}|${marca}|${modelo}|${procesador}|${generacion}|${ram}|${ssd}|${hdd}|${precioPublico}|${precioMayorista}`;

        if (!gruposNota[key]) {
            gruposNota[key] = {
                item: item,
                series: [],
                cantidad: 0,
                precioMayorista: precioMayorista,
                precioPublico: precioPublico
            };
        }
        gruposNota[key].series.push(item.serie);
        gruposNota[key].cantidad++;
    });

    const tipoCliente = document.getElementById('regTipoClienteNota').value;

    Object.values(gruposNota).forEach(grupo => {
        const item = grupo.item;
        const tr = document.createElement('tr');
        tr.setAttribute('data-precio-mayorista', grupo.precioMayorista);
        tr.setAttribute('data-precio-publico', grupo.precioPublico);

        let descripcion = `${item.categoria || ''} ${item.marca || ''} ${item.modelo || ''}\nProcesador: ${item.procesador || ''} ${item.generacion || ''} - RAM: ${item.ram || ''}\nAlmacenamiento: SSD ${item.ssd || 'N/A'} / HDD ${item.hdd || 'N/A'}\nSistema Operativo: ${item.os || 'Sin SO'}`;
        if (grupo.series.length > 0) {
            descripcion += `\nN/S: ${grupo.series.join(', ')}`;
        }

        const costoInicial = tipoCliente === 'mayorista' ? (grupo.precioMayorista || grupo.precioPublico || 0) : (grupo.precioPublico || grupo.precioMayorista || 0);

        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm coti-clave" value="CODM"></td>
            <td><textarea class="form-control form-control-sm coti-desc " rows="3">${descripcion}</textarea></td>
            <td><input type="number" class="form-control form-control-sm coti-costo" step="0.01" value="${costoInicial}"></td>
            <td><input type="number" class="form-control form-control-sm coti-cant" value="${grupo.cantidad}"></td>
            <td class="text-center"><button type="button" class="btn btn-sm border-0 btn-outline-danger btn-eliminar-fila"><i class="fa-solid fa-trash"></i></button></td>
        `;

        tablaItemsNotaBody.appendChild(tr);
        tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
    });

    const modalEl = document.getElementById('modalContenedorRegistros');
    if (modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
    }

    modalCrearNotaVenta.show();
    btnGenerarCotizacionModal.disabled = false;
    btnGenerarCotizacionModal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>${esNotaProceso ? 'Nota de Proceso' : 'Nota de Venta'}`;
};

window.abrirHistorialCotizaciones = async () => {
    modalLoading.show();
    try {
        const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"));
        const snap = await getDocs(q);
        const tbody = document.getElementById('cuerpoTablaCotizaciones');
        tbody.innerHTML = '';

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aún no hay documentos guardados en el historial.</td></tr>';
        } else {
            snap.forEach(docSnap => {
                const d = docSnap.data();
                const esActa = d.tipo === 'acta';
                const esNota = d.tipo === 'nota';
                const fecha = esActa
                    ? (d.fechaISO ? new Date(d.fechaISO + "T00:00:00").toLocaleDateString('es-MX') : (d.fecha || 'N/A'))
                    : (d.fecha ? new Date(d.fecha + "T00:00:00").toLocaleDateString('es-MX') : 'N/A');
                const total = esActa
                    ? `${(d.items || []).length} equipo(s)`
                    : `$${Number(d.totalGlobal).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
                const badgeTipo = esActa
                    ? '<span class="badge bg-danger-subtle border-danger-subtle text-danger ms-1">Acta</span>'
                    : (esNota ? '<span class="badge bg-success-subtle border-success-subtle text-success ms-1">Nota</span>' : '<span class="badge bg-light text-secondary border ms-1">Coti</span>');
                let acciones = '';
                if (esActa) {
                    acciones = `
                            <button class="btn btn-sm btn-outline-secondary border-0 ms-1" onclick="editarActa('${d.folio}', false)" title="Editar"><i class="fa-solid fa-file-pen"></i></button>
                            <button class="btn btn-sm btn-outline-dark border-0 ms-1" onclick="reconstruirActa('${d.folio}')" title="Reconstruir"><i class="fa-solid fa-file-circle-plus"></i></button>
                            <button class="btn btn-sm btn-outline-danger border-0 ms-1" onclick="descargarPDFActaDirecto('${d.folio}', false)" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>
                            <button class="btn btn-sm btn-outline-dark border-0 ms-1" onclick="descargarPDFActaDirecto('${d.folio}', true)" title="Vista Previa"><i class="fa-solid fa-eye"></i></button>`;
                } else {
                    acciones = `
                            <button class="btn btn-sm btn-outline-secondary border-0 ms-1" onclick="editarCotizacion('${d.folio}', false)" title="Editar"><i class="fa-solid fa-file-pen"></i></button>
                            <button class="btn btn-sm btn-outline-dark border-0 ms-1" onclick="reconstruirCotizacion('${d.folio}')" title="Reconstruir"><i class="fa-solid fa-file-circle-plus"></i></button>
                            <button class="btn btn-sm btn-outline-danger border-0 ms-1" onclick="descargarPDFCotizacionDirecto('${d.folio}', false)" title="Descargar PDF"><i class="fa-solid fa-file-pdf"></i></button>
                            <button class="btn btn-sm btn-outline-dark border-0 ms-1" onclick="descargarPDFCotizacionDirecto('${d.folio}', true)" title="Vista Previa"><i class="fa-solid fa-eye"></i></button>`;
                }
                tbody.innerHTML += `
                    <tr>
                        <td><span class="badge bg-danger-subtle border-danger-subtle text-danger">${d.folio}</span>${badgeTipo}</td>
                        <td>${fecha}</td>
                        <td class="fw-bold text-secondary">${d.cliente || 'Sin cliente especificado'}</td>
                        <td>${total}</td>
                        <td class="text-center">${acciones}</td>
                    </tr>
                `;
            });
        }
        modalLoading.hide();
        new bootstrap.Modal(document.getElementById('modalHistorialCotizaciones')).show();
    } catch (error) {
        modalLoading.hide();
        console.error("Error cargando historial de cotizaciones:", error);
        await Swal.fire({
            title: "Error",
            text: "Error al cargar el historial.",
            icon: "error"
        });
    }
};

window.descargarPDFCotizacionDirecto = async (folio, soloPrevisualizar = false) => {
    modalLoading.show();
    try {
        const docRef = doc(db, "cotizaciones", folio);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await Swal.fire({
                title: "No Encontrado",
                text: "El registro solicitado no existe.",
                icon: "error"
            });
            modalLoading.hide();
            return;
        }

        const d = snap.data();
        const esNota = d.tipo === 'nota';
        const esNotaProceso = esNota && d.tipoNota === 'proceso';

        const cliente = d.cliente || '';
        const telefono = d.telefono || '';
        const email = d.email || '';
        const fechaFormateada = d.fecha ? new Date(d.fecha + "T00:00:00").toLocaleDateString('es-MX') : "";
        const emisorSeleccionado = d.emisor || "proseinet";
        const tasaIvaSeleccionada = d.tasaIva || "16";
        const subtotalGlobal = Number(d.subtotalGlobal) || 0;
        const totalGlobal = Number(d.totalGlobal) || 0;
        const ivaGlobal = totalGlobal - subtotalGlobal;

        const bodyPDF = [];
        let iterador = 1;
        (d.items || []).forEach(item => {
            const costo = Number(item.costo) || 0;
            const cant = Number(item.cant) || 0;
            const importeFila = costo * cant;
            bodyPDF.push([
                iterador,
                item.clave || 'CODM',
                item.desc || '',
                `$${costo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                cant,
                `$${importeFila.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
            ]);
            iterador++;
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'letter',
            compress: true
        });

        const logo = new Image();
        logo.src = '/img/PROSEINET-LOGO-PDFs.png';
        const logoPromise = new Promise((resolve) => {
            logo.onload = () => resolve(true);
            logo.onerror = () => resolve(false);
        });

        const logoRedes = new Image();
        logoRedes.src = '/img/redes-pdf.png';
        const logoRedesPromise = new Promise((resolve) => {
            logoRedes.onload = () => resolve(true);
            logoRedes.onerror = () => resolve(false);
        });

        await Promise.all([logoPromise, logoRedesPromise]);

        const pagesDrawn = new Set();
        const drawHeaderAndFooter = (pageNum) => {
            if (pagesDrawn.has(pageNum)) return;
            pagesDrawn.add(pageNum);

            pdf.setFillColor(0, 0, 0);
            pdf.rect(10, 10, 90, 20, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            if (esNota) {
                pdf.text("Fecha:", 22, 14, { align: "right" });
                pdf.text(esNotaProceso ? "ID Proceso:" : "Nota de Venta:", 33, 19, { align: "right" });
                pdf.text(fechaFormateada, 46, 14, { align: "right" });
                pdf.text(folio, 50, 19, { align: "right" });
            } else {
                pdf.text("Fecha:", 28, 14, { align: "right" });
                pdf.text("Cotización:", 28, 19, { align: "right" });
                pdf.text(fechaFormateada, 48, 14, { align: "right" });
                pdf.text(folio, 48, 19, { align: "right" });
            }

            if (emisorSeleccionado === 'proseinet') {
                pdf.setFillColor(160, 20, 20);
                pdf.rect(10, 22, 90, 20, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("PROSEINET S.A.S. de C.V.", 12, 30);
                pdf.setFontSize(10);
                pdf.text("RFC: PRO1811056Y6", 12, 34);
            } else {
                pdf.setFillColor(6, 75, 167);
                pdf.rect(10, 22, 90, 20, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(14);
                pdf.setFont("helvetica", "bold");
                pdf.text("Juan José Arreola Bucio", 12, 30);
                pdf.setFontSize(10);
                pdf.text("RFC: AEBJ88090977A", 12, 34);
            }

            if (logo.complete && logo.naturalWidth !== 0) {
                pdf.addImage(logo, 'PNG', 135, -6, 60, 64, undefined, 'FAST');
            }

            const pageHeight = pdf.internal.pageSize.getHeight();
            const footerY = pageHeight - 20;

            pdf.setFillColor(20, 20, 20);
            pdf.rect(10, footerY, 196, 15, 'F');

            if (emisorSeleccionado === 'proseinet') {
                pdf.setFillColor(160, 20, 20);
                pdf.rect(10, footerY - 5, 50, 5, 'F');
            } else {
                pdf.setFillColor(6, 75, 167);
                pdf.rect(10, footerY - 5, 50, 5, 'F');
            }

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.text("https://proseinet.mx/", 12, footerY - 1.5);

            pdf.setFillColor(110, 110, 110);

            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.text("Gral. Pedro María Anaya #235 Int. 5, Col. Chapultepec Nte. c.p 58260 Morelia, Mich.", 12, footerY + 4.5);
            pdf.text("Tel: 443 684 3852, 443 273 1724, Correo: proseinet.sas@gmail.com", 12, footerY + 8);

            if (logoRedes.complete && logoRedes.naturalWidth !== 0) {
                pdf.addImage(logoRedes, 'PNG', 135, footerY - 2.5, 60, 20, undefined, 'FAST');
            }
        };

        const tituloTabla = esNota ? (esNotaProceso ? 'NOTA DE PROCESO DE EQUIPOS O SERVICIOS' : 'NOTA DE VENTA DE EQUIPOS O SERVICIOS') : 'COTIZACIÓN DE EQUIPOS O SERVICIOS';
        pdf.autoTable({
            startY: 45,
            margin: { top: 55, bottom: 28, left: 10, right: 10 },
            theme: 'grid',
            body: [
                ['Cliente', cliente],
                ['Teléfono', telefono],
                ['e-mail', email],
                [{ content: tituloTabla, colSpan: 2, styles: { fillColor: [220, 220, 220], halign: 'center' } }]
            ],
            columnStyles: {
                0: { cellWidth: 35, fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] },
                1: { cellWidth: 'auto', fillColor: [245, 245, 245], textColor: [0, 0, 0] }
            },
            styles: { fontSize: 9, cellPadding: 1.5, lineColor: [100, 100, 100], lineWidth: 0.1 },
            didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
        });

        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY,
            margin: { top: 55, bottom: 28, left: 10, right: 10 },
            theme: 'grid',
            head: [['Item', 'Clave', 'Descripción', 'Cost. U', 'Cantidad', 'Importe']],
            body: bodyPDF,
            headStyles: { fillColor: [150, 150, 150], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center', valign: 'middle', fillColor: [230, 230, 230], fontStyle: 'bold' },
                1: { cellWidth: 22, halign: 'center', valign: 'middle' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] },
                4: { cellWidth: 16, halign: 'center', valign: 'middle', fillColor: [240, 240, 240] },
                5: { cellWidth: 26, halign: 'left', valign: 'middle', fillColor: [240, 240, 240] }
            },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1, textColor: [0, 0, 0] },
            didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
        });

        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY,
            margin: { top: 55, bottom: 28, left: 137.9, right: 10 },
            theme: 'grid',
            body: [
                ['Subtotal', `$${subtotalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
                [`IVA (${tasaIvaSeleccionada}%)`, `$${ivaGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`],
                ['Total', `$${totalGlobal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`]
            ],
            columnStyles: {
                0: { cellWidth: 42, fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'right', textColor: [0, 0, 0] },
                1: { cellWidth: 26, fillColor: [20, 20, 20], fontStyle: 'bold', halign: 'left', textColor: [255, 255, 255] }
            },
            styles: { fontSize: 9, cellPadding: 2, lineColor: [100, 100, 100], lineWidth: 0.1 },
            pageBreak: 'avoid',
            didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
        });

        let currentY = pdf.lastAutoTable.finalY + 5;
        pdf.setFont("helvetica", 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(9);

        const entrega = d.tiempoEntrega || '';
        const metodoPago = d.metodoPago || '';
        const pago = d.condicionesPago || '';
        const vigencia = d.vigencia || '';
        const firma = d.firma || '';

        const tipoNotaTexto = esNota ? (esNotaProceso ? 'nota de proceso' : 'nota de venta') : 'cotización';
        const textoIva = tasaIvaSeleccionada === '0'
            ? `*Esta ${tipoNotaTexto} no cuenta con IVA`
            : `*Esta ${tipoNotaTexto} incluye IVA (${tasaIvaSeleccionada}%)`;

        const etiquetaVigencia = esNota ? 'Garantía' : 'Vigencia de la Cotización';

        pdf.autoTable({
            startY: currentY,
            margin: { top: 55, bottom: 28, left: 10, right: 10 },
            theme: 'grid',
            body: [
                [{ content: 'Tiempo de entrega', fontStyle: 'bold' }, entrega],
                [{ content: 'Método de Pago', fontStyle: 'bold' }, metodoPago],
                [{ content: 'Condiciones de Pago', fontStyle: 'bold' }, pago],
                [{ content: etiquetaVigencia, fontStyle: 'bold' }, vigencia],
                [{
                    content: textoIva,
                    colSpan: 2,
                    fontStyle: 'italic',
                    textColor: [80, 80, 80]
                }],
                [{ content: 'Atentamente:\n\n' + firma, colSpan: 2, halign: 'center', fontStyle: 'bold' }]
            ],
            columnStyles: {
                0: { cellWidth: 50, fillColor: [240, 240, 240] },
                1: { cellWidth: 'auto', fillColor: [245, 245, 245] }
            },
            styles: { fontSize: 9, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1, textColor: [0, 0, 0] },
            pageBreak: 'avoid',
            didDrawPage: (data) => drawHeaderAndFooter(data.pageNumber)
        });

        const msjWpp = d.mensaje || '';
        currentY = pdf.lastAutoTable.finalY + 5;
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (msjWpp !== "") {
            const splitMsj = pdf.splitTextToSize(msjWpp, 280);
            const msjHeight = splitMsj.length * 3;

            if (currentY + msjHeight > pageHeight - 28) {
                pdf.addPage();
                const newPageNum = pdf.internal.getNumberOfPages();
                drawHeaderAndFooter(newPageNum);
                currentY = 55;
            }

            pdf.setFontSize(6);
            pdf.text(splitMsj, 10, currentY);
        }

        modalLoading.hide();

        if (soloPrevisualizar) {
            const blob = pdf.output('blob');
            if (activePreviewBlobUrl) {
                URL.revokeObjectURL(activePreviewBlobUrl);
            }
            activePreviewBlobUrl = URL.createObjectURL(blob);
            document.getElementById('iframeVistaPreviaPDF').src = activePreviewBlobUrl;

            window.lastModalOpen = 'historial';
            window.evitarResetModal = true;

            const modalHistorialEl = document.getElementById('modalHistorialCotizaciones');
            if (modalHistorialEl) {
                const inst = bootstrap.Modal.getInstance(modalHistorialEl);
                if (inst) inst.hide();
            }
            modalVistaPreviaPDF.show();
        } else {
            const nombreArchivo = `${esNota ? 'Nota_Venta' : 'Cotizacion'}_${d.cliente}_${folio}.pdf`;
            pdf.save(nombreArchivo);

            await Swal.fire({
                title: "Descargado",
                text: "El archivo PDF ha sido descargado correctamente.",
                icon: "success"
            });
        }

    } catch (error) {
        modalLoading.hide();
        console.error("Error al descargar PDF:", error);
        await Swal.fire({
            title: "Error",
            text: "No se pudo descargar el PDF.",
            icon: "error"
        });
    }
};

window.editarCotizacion = async (folio, esDuplicado = false) => {
    window.ultimoOrigenModal = 'historial';
    modalLoading.show();
    try {
        const docRef = doc(db, "cotizaciones", folio);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await Swal.fire({
                title: "No Encontrado",
                text: "El registro solicitado no existe.",
                icon: "error"
            });
            modalLoading.hide();
            return;
        }
        const d = snap.data();
        const esNota = d.tipo === 'nota';
        const pfx = esNota ? 'Nota' : 'Coti';

        const regFolio = document.getElementById(`regFolio${pfx}`);
        const regFecha = document.getElementById(`regFecha${pfx}`);
        const regEmisor = document.getElementById(`regEmisor${pfx}`);
        const regCliente = document.getElementById(`regCliente${pfx}`);
        const regTelefono = document.getElementById(`regTelefono${pfx}`);
        const regEmail = document.getElementById(`regEmail${pfx}`);
        const regMensaje = document.getElementById(`regMensaje${pfx}`);
        const regTiempoEntrega = document.getElementById(esNota ? 'regTiempoEntregaNota' : 'regTiempoEntrega');
        const regMetodoPago = document.getElementById(esNota ? 'regMetodoPagoNota' : 'regMetodoPago');
        const regCondicionesPago = document.getElementById(esNota ? 'regCondicionesPagoNota' : 'regCondicionesPago');
        const regVigencia = document.getElementById(esNota ? 'regVigenciaNota' : 'regVigenciaCoti');
        const regFirma = document.getElementById(`regFirma${pfx}`);

        if (esDuplicado) {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snapList = await getDocs(q);
            let nextFolioNum = 964;
            if (!snapList.empty) {
                nextFolioNum = snapList.docs[0].data().folioNum + 1;
            }
            regFolio.value = `PRO-${nextFolioNum}`;
            regFolio.setAttribute('data-folionum', nextFolioNum);
            regFecha.value = new Date().toISOString().split('T')[0];

            if (esNota) {
                const modalEl = document.getElementById('modalCrearNotaVenta');
                if (modalEl) {
                    modalEl.removeAttribute('data-modo');
                    modalEl.removeAttribute('data-folio-original');
                    modalEl.removeAttribute('data-folio-num-original');
                }
                const tituloModal = document.getElementById('tituloModalNota');
                if (tituloModal) {
                    tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Reconstruir ${d.tipoNota === 'proceso' ? 'Nota de Proceso' : 'Nota de Venta'}`;
                }
                const btnGenerarPDFNotaFinal = document.getElementById('btnGenerarPDFNotaFinal');
                if (btnGenerarPDFNotaFinal) {
                    btnGenerarPDFNotaFinal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>Exportar`;
                }
            } else {
                const modalEl = document.getElementById('modalCrearCotizacion');
                if (modalEl) {
                    modalEl.removeAttribute('data-modo');
                    modalEl.removeAttribute('data-folio-original');
                    modalEl.removeAttribute('data-folio-num-original');
                }
                const tituloModal = document.querySelector('#modalCrearCotizacion .modal-title');
                if (tituloModal) {
                    tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Reconstruir Cotización`;
                }
                const btnGenerarPDFCotizacionFinal = document.getElementById('btnGenerarPDFCotizacionFinal');
                if (btnGenerarPDFCotizacionFinal) {
                    btnGenerarPDFCotizacionFinal.innerHTML = `<i class="fa-solid fa-file-export me-2"></i>Exportar`;
                }
                const btnLimpiarCotizacion = document.getElementById('btnLimpiarCotizacion');
                if (btnLimpiarCotizacion) {
                    btnLimpiarCotizacion.style.display = '';
                }
            }
        } else {
            regFolio.value = d.folio;
            regFolio.setAttribute('data-folionum', d.folioNum);
            regFecha.value = d.fecha || "";
        }

        regEmisor.value = d.emisor || "proseinet";
        regCliente.value = d.cliente || "";
        regTelefono.value = d.telefono || "";
        regEmail.value = d.email || "";
        regMensaje.value = d.mensaje || "";
        regTiempoEntrega.value = d.tiempoEntrega || "";
        regMetodoPago.value = d.metodoPago || "";
        regCondicionesPago.value = d.condicionesPago || "";
        if (regVigencia) {
            const val = d.vigencia || "";
            if (regVigencia.tagName === 'SELECT' && val && !Array.from(regVigencia.options).some(opt => opt.value === val)) {
                const opt = new Option(val, val);
                regVigencia.add(opt);
            }
            regVigencia.value = val;
        }
        regFirma.value = d.firma || "";

        const regTipoCliente = document.getElementById(esNota ? 'regTipoClienteNota' : 'regTipoClienteCoti');
        if (regTipoCliente) {
            regTipoCliente.value = d.tipoCliente || "publico";
        }

        if (d.tasaIva === "8") {
            document.getElementById(esNota ? 'iva8Nota' : 'iva8').checked = true;
        } else if (d.tasaIva === "0") {
            document.getElementById(esNota ? 'iva0Nota' : 'iva0').checked = true;
        } else {
            document.getElementById(esNota ? 'iva16Nota' : 'iva16').checked = true;
        }

        const tbodyItems = esNota ? tablaItemsNotaBody : tablaItemsCotiBody;
        tbodyItems.innerHTML = '';
        if (d.items && d.items.length > 0) {
            d.items.forEach(item => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-precio-mayorista', item.precioMayorista || 0);
                tr.setAttribute('data-precio-publico', item.precioPublico || 0);
                tr.innerHTML = `
                    <td><input type="text" class="form-control form-control-sm coti-clave" value="CODM"></td>
                    <td><textarea class="form-control form-control-sm coti-desc" rows="3">${item.desc}</textarea></td>
                    <td><input type="number" class="form-control form-control-sm coti-costo" step="0.01" value="${item.costo}"></td>
                    <td><input type="number" class="form-control form-control-sm coti-cant" value="${item.cant}"></td>
                    <td class="text-center"><button type="button" class="btn btn-sm border-0 btn-outline-danger btn-eliminar-fila"><i class="fa-solid fa-trash"></i></button></td>
                `;
                tbodyItems.appendChild(tr);
                tr.querySelector('.btn-eliminar-fila').addEventListener('click', () => tr.remove());
            });
        } else {
            if (esNota) agregarFilaNota(); else agregarFilaCoti();
        }

        modalLoading.hide();
        const modalHistorialEl = document.getElementById('modalHistorialCotizaciones');
        if (modalHistorialEl) bootstrap.Modal.getInstance(modalHistorialEl).hide();

        if (!esDuplicado) {
            if (esNota) {
                const modalEl = document.getElementById('modalCrearNotaVenta');
                if (modalEl) {
                    modalEl.setAttribute('data-modo', 'editar');
                    modalEl.setAttribute('data-folio-original', folio);
                    modalEl.setAttribute('data-folio-num-original', d.folioNum);
                }
                const tituloModal = document.getElementById('tituloModalNota');
                if (tituloModal) {
                    tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Editar ${d.tipoNota === 'proceso' ? 'Nota de Proceso' : 'Nota de Venta'}`;
                }
                const btnGenerarPDFNotaFinal = document.getElementById('btnGenerarPDFNotaFinal');
                if (btnGenerarPDFNotaFinal) {
                    btnGenerarPDFNotaFinal.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`;
                }
            } else {
                const modalEl = document.getElementById('modalCrearCotizacion');
                if (modalEl) {
                    modalEl.setAttribute('data-modo', 'editar');
                    modalEl.setAttribute('data-folio-original', folio);
                    modalEl.setAttribute('data-folio-num-original', d.folioNum);
                }
                const tituloModal = document.querySelector('#modalCrearCotizacion .modal-title');
                if (tituloModal) {
                    tituloModal.innerHTML = `<div class="modal-icon-badge info"><i class="bi bi-file-earmark-pdf"></i></div> Editar Cotización`;
                }
                const btnGenerarPDFCotizacionFinal = document.getElementById('btnGenerarPDFCotizacionFinal');
                if (btnGenerarPDFCotizacionFinal) {
                    btnGenerarPDFCotizacionFinal.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i>Guardar Cambios`;
                }
                const btnLimpiarCotizacion = document.getElementById('btnLimpiarCotizacion');
                if (btnLimpiarCotizacion) {
                    btnLimpiarCotizacion.style.display = 'none';
                }
            }
        }

        if (esNota) {
            modalCrearNotaVenta.show();
        } else {
            modalCrearCotizacion.show();
        }
    } catch (error) {
        modalLoading.hide();
        console.error("Error al editar registro:", error);
    }
};

window.reconstruirCotizacion = async (folio) => {
    await window.editarCotizacion(folio, true);
};

window.cotizarSeleccionados = async () => {
    window.cerrarDropdownAcciones();
    window.modoCotizacionManual = false;
    const seleccionados = window.obtenerSeleccionados();
    if (seleccionados.length === 0) {
        await Swal.fire({
            title: "Selección Requerida",
            text: "No se han seleccionado productos",
            icon: "warning"
        });
        return;
    }

    modalLoading.show();
    let equiposAlmacen = [];
    let omitidos = 0;

    try {
        for (let serie of seleccionados) {
            const d = (window.inventarioGlobal || []).find(item => item.serie === serie);
            if (d) {
                const estatus = String(d.estatus || '').trim().toLowerCase();

                if (estatus === 'almacén' || estatus === 'almacen') {
                    equiposAlmacen.push(d);
                } else {
                    omitidos++;
                }
            } else {
                omitidos++;
            }
        }

        if (equiposAlmacen.length === 0) {
            modalLoading.hide();
            await Swal.fire({
                title: "Equipos no Disponibles",
                text: `Ninguno de los equipos seleccionados se encuentra en el almacén, se omitieron ${omitidos} equipos.`,
                icon: "warning"
            });
            return;
        }

        if (omitidos > 0) {
            await Swal.fire({
                title: "Equipos Omitidos",
                text: `Se omitirán ${omitidos} equipos, los cuales no se encuentran en el almacén.`,
                icon: "info"
            });
        }

        const savedDataStr = localStorage.getItem('cotizacion_temporal');
        let savedData = null;
        if (savedDataStr) {
            try {
                savedData = JSON.parse(savedDataStr);
            } catch (e) {
                console.error("Error parsing saved cotizacion:", e);
            }
        }

        if (savedData) {
            document.getElementById('regFolioCoti').value = savedData.folio || '';
            document.getElementById('regFolioCoti').setAttribute('data-folionum', savedData.folioNum || '');
            document.getElementById('regFechaCoti').value = savedData.fecha || '';
            document.getElementById('regClienteCoti').value = savedData.cliente || '';
            document.getElementById('regTelefonoCoti').value = savedData.telefono || '';
            document.getElementById('regEmailCoti').value = savedData.email || '';
            document.getElementById('regTipoClienteCoti').value = savedData.tipoCliente || 'publico';
            document.getElementById('regEmisorCoti').value = savedData.emisor || 'proseinet';
            document.getElementById('regMensajeCoti').value = savedData.mensaje || '*La garantía aplica exclusivamente sobre fallas de hardware atribuibles al funcionamiento propio del equipo, excluyendo daños ocasionados por mal uso, variaciones eléctricas, humedad, golpes, manipulación no autorizada o instalación de componentes ajenos. *Debido a la naturaleza consumible y al desgaste inherente de las baterías, no es posible garantizar su capacidad, autonomía, duración o vida útil remanente, por lo que dichos componentes quedan expresamente excluidos de cualquier cobertura de garantía';
            document.getElementById('regTiempoEntrega').value = savedData.tiempoEntrega || '';
            document.getElementById('regMetodoPago').value = savedData.metodoPago || '';
            document.getElementById('regCondicionesPago').value = savedData.condicionesPago || '';
            document.getElementById('regVigenciaCoti').value = savedData.vigencia || '';
            document.getElementById('regFirmaCoti').innerHTML = "L.A.E Juan José Arreola Bucio&#10;Director General";

            if (savedData.tasaIva === '16') {
                document.getElementById('iva16').checked = true;
            } else if (savedData.tasaIva === '8') {
                document.getElementById('iva8').checked = true;
            } else {
                document.getElementById('iva0').checked = true;
            }

            tablaItemsCotiBody.innerHTML = '';
            if (savedData.items && savedData.items.length > 0) {
                savedData.items.forEach(item => {
                    agregarFilaCoti(item.clave, item.desc, item.costo, item.cant, item.precioMayorista, item.precioPublico, item.key);
                });
            }
        } else {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snapCoti = await getDocs(q);
            let nextFolioNum = 900;

            if (!snapCoti.empty) {
                nextFolioNum = snapCoti.docs[0].data().folioNum + 1;
            }

            document.getElementById('regFolioCoti').value = `PRO-${nextFolioNum}`;
            document.getElementById('regFolioCoti').setAttribute('data-folionum', nextFolioNum);
            document.getElementById('regFechaCoti').value = new Date().toISOString().split('T')[0];
            document.getElementById('regClienteCoti').value = "";
            document.getElementById('regTelefonoCoti').value = "";
            document.getElementById('regEmailCoti').value = "";
            document.getElementById('regTipoClienteCoti').value = "publico";
            document.getElementById('regMensajeCoti').value = "La garantía aplica exclusivamente sobre fallas de hardware atribuibles al funcionamiento propio del equipo, excluyendo daños ocasionados por mal uso, variaciones eléctricas, humedad, golpes, manipulación no autorizada o instalación de componentes ajenos. *Debido a la naturaleza consumible y al desgaste inherente de las baterías, no es posible garantizar su capacidad, autonomía, duración o vida útil remanente, por lo que dichos componentes quedan expresamente excluidos de cualquier cobertura de garantía";
            document.getElementById('iva16').checked = true;
            document.getElementById('regFirmaCoti').innerHTML = "L.A.E Juan José Arreola Bucio&#10;Director General"

            tablaItemsCotiBody.innerHTML = '';
        }

        const gruposCoti = {};
        equiposAlmacen.forEach(item => {
            const cat = String(item.categoria || '').trim().toUpperCase();
            const marca = String(item.marca || '').trim().toUpperCase();
            const modelo = String(item.modelo || '').trim().toUpperCase();
            const procesador = String(item.procesador || '').trim().toUpperCase();
            const generacion = String(item.generacion || '').trim().toUpperCase();
            const ram = String(item.ram || '').trim().toUpperCase();
            const ssd = String(item.ssd || '').trim().toUpperCase();
            const hdd = String(item.hdd || '').trim().toUpperCase();
            const condicion = String(item.condicion || '').trim().toUpperCase();
            const os = String(item.os || '').trim().toUpperCase();
            const precioMayorista = Number(item.precioMayorista) || 0;
            const precioPublico = Number(item.precioPublico) || 0;

            const key = `${cat}|${marca}|${modelo}|${procesador}|${generacion}|${ram}|${ssd}|${hdd}|${precioPublico}|${precioMayorista}`;

            if (!gruposCoti[key]) {
                gruposCoti[key] = {
                    item: item,
                    series: [],
                    cantidad: 0,
                    precioMayorista: precioMayorista,
                    precioPublico: precioPublico
                };
            }
            gruposCoti[key].series.push(item.serie);
            gruposCoti[key].cantidad++;
        });

        const tipoCliente = document.getElementById('regTipoClienteCoti').value;

        Object.keys(gruposCoti).forEach(key => {
            const grupo = gruposCoti[key];
            const item = grupo.item;

            const existingRow = tablaItemsCotiBody.querySelector(`tr[data-key="${key}"]`);
            if (existingRow) {
                const cantInput = existingRow.querySelector('.coti-cant');
                const descTextarea = existingRow.querySelector('.coti-desc');
                if (cantInput && descTextarea) {
                    const currentCant = parseInt(cantInput.value) || 0;
                    cantInput.value = currentCant + grupo.cantidad;

                    let currentDesc = descTextarea.value;
                    if (grupo.series.length > 0) {
                        if (currentDesc.includes("N/S:")) {
                            currentDesc += `, ${grupo.series.join(', ')}`;
                        } else {
                            currentDesc += `\nN/S: ${grupo.series.join(', ')}`;
                        }
                        descTextarea.value = currentDesc;
                    }
                }
            } else {
                let descripcion = `${item.categoria || ''} ${item.marca || ''} ${item.modelo || ''}\nProcesador: ${item.procesador || ''} ${item.generacion || ''} - RAM: ${item.ram || ''}\nAlmacenamiento: SSD ${item.ssd || 'N/A'} / HDD ${item.hdd || 'N/A'}\nSistema Operativo: ${item.os || 'Sin SO'}`;
                if (grupo.series.length > 0) {
                    descripcion += `\nN/S: ${grupo.series.join(', ')}`;
                }

                const claveValue = grupo.series.join(', ');
                const costoInicial = tipoCliente === 'mayorista' ? (grupo.precioMayorista || grupo.precioPublico || 0) : (grupo.precioPublico || grupo.precioMayorista || 0);

                agregarFilaCoti(claveValue, descripcion, costoInicial, grupo.cantidad, grupo.precioMayorista, grupo.precioPublico, key);
            }
        });



        modalLoading.hide();
        modalCrearCotizacion.show();

    } catch (error) {
        modalLoading.hide();
        console.log("Error preparando cotizacion de almacén: ", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al cargar la información para la cotización",
            icon: "error"
        });
    }
};

function confirmarAccion(titulo, mensaje, textoBotonAceptar, textoBotonCancelar) {
    return new Promise((resolve) => {
        document.getElementById('confirmacionTitulo').innerText = titulo;
        document.getElementById('confirmacionMensaje').innerText = mensaje;

        const btnAceptar = document.getElementById('btnConfirmacionAceptar');
        const btnCancelar = document.getElementById('btnConfirmacionCancelar');

        btnAceptar.innerText = textoBotonAceptar;
        btnCancelar.innerText = textoBotonCancelar;

        const modalElement = document.getElementById('modalConfirmacionPersonalizada');
        const modalInstance = new bootstrap.Modal(modalElement);

        btnAceptar.onclick = () => {
            modalInstance.hide();
            resolve(true);
        };

        btnCancelar.onclick = () => {
            modalInstance.hide();
            resolve(false);
        };

        modalElement.addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });

        modalInstance.show();
    });
}

(function () {
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const toggleIcon = document.getElementById('toggleIcon');

    const setIconCollapsed = (collapsed) => {
        if (toggleIcon) {
            toggleIcon.style.display = 'inline-block';
            toggleIcon.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    };

    const sidebarState = localStorage.getItem('sidebar_collapsed');
    const isCollapsedInit = sidebarState === 'true';
    if (isCollapsedInit) {
        document.body.classList.add('sidebar-collapsed');
    }
    setIconCollapsed(isCollapsedInit);

    if (btnToggleSidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            const isCollapsing = !document.body.classList.contains('sidebar-collapsed');
            document.body.classList.toggle('sidebar-collapsed', isCollapsing);
            localStorage.setItem('sidebar_collapsed', isCollapsing);
            setIconCollapsed(isCollapsing);

            if (isCollapsing) {
                const collapseDocs = document.getElementById('submenuDocumentos');

                if (collapseDocs && collapseDocs.classList.contains('show')) {
                    const bsCollapse = bootstrap.Collapse.getInstance(collapseDocs);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            }
        });
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const btnMobileMenu = document.getElementById('btnMobileMenu');

    if (btnMobileMenu) {
        btnMobileMenu.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-mobile-open');
        });
    }

    document.addEventListener('click', (e) => {
        const isMobile = window.innerWidth <= 768;
        const isSidebarOpen = document.body.classList.contains('sidebar-mobile-open');

        if (isMobile && isSidebarOpen) {
            if (!e.target.closest('.sidebar') && !e.target.closest('#btnMobileMenu')) {
                document.body.classList.remove('sidebar-mobile-open');
            }
        }
    });
});

window.abonosPaginaActual = 1;
window.abonosHistorialGlobal = [];
window.abonosTotalVentaGlobal = 0;
window.abonosPrecioPublicoGlobal = 0;
window.abonosPrecioMayoristaGlobal = 0;

window.cargarAbonosUI = async (serie) => {
    const docRef = doc(db, 'almacen', serie);
    const snap = await getDoc(docRef);

    const d = snap.data();
    window.abonosHistorialGlobal = d.historialAbonos || [];
    window.abonosPrecioPublicoGlobal = Number(d.precioPublico) || 0;
    window.abonosPrecioMayoristaGlobal = Number(d.precioMayorista) || 0;

    const tipoPrecioGuardado = d.tipoPrecioAbono || 'publico';
    window.abonosTipoPrecioActual = tipoPrecioGuardado;

    const btn = document.getElementById('btnAbonoTipoPrecio');
    if (tipoPrecioGuardado === 'publico') {
        window.abonosTotalVentaGlobal = window.abonosPrecioPublicoGlobal;
        if (btn) btn.innerText = 'Público';
    } else {
        window.abonosTotalVentaGlobal = window.abonosPrecioMayoristaGlobal;
        if (btn) btn.innerText = 'Mayorista';
    }

    window.renderizarAbonosUI();
};

window.cambiarTipoPrecioAbono = async (tipo) => {
    const btn = document.getElementById('btnAbonoTipoPrecio');
    window.abonosTipoPrecioActual = tipo;

    if (tipo === 'publico') {
        window.abonosTotalVentaGlobal = window.abonosPrecioPublicoGlobal;
        if (btn) btn.innerText = 'Público';
    } else {
        window.abonosTotalVentaGlobal = window.abonosPrecioMayoristaGlobal;
        if (btn) btn.innerText = 'Mayorista';
    }
    window.renderizarAbonosUI();

    try {
        const serie = window.serieAbonoActiva;
        if (serie) {
            const docRef = doc(db, 'almacen', serie);
            await updateDoc(docRef, { tipoPrecioAbono: tipo });
            const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
            if (index !== -1) {
                window.inventarioGlobal[index].tipoPrecioAbono = tipo;
            }
            cargarInventario('inicio', false);
            if (typeof window.scrollToTableHeader === 'function') {
                window.scrollToTableHeader();
            }
        }
    } catch (error) {
        console.error("Error al guardar el tipo de precio:", error);
    }
};

window.renderizarAbonosUI = () => {
    const totalAbonado = window.abonosHistorialGlobal.reduce((sum, item) => sum + Number(item.monto), 0);
    const listaAbonos = document.getElementById('listaHistorialAbonosModal');
    if (!listaAbonos) return;

    listaAbonos.innerHTML = '';

    const tamanoPaginaAbonos = 5;
    const totalPaginasAbonos = Math.max(1, Math.ceil(window.abonosHistorialGlobal.length / tamanoPaginaAbonos));

    if (window.abonosPaginaActual > totalPaginasAbonos) window.abonosPaginaActual = totalPaginasAbonos;
    if (window.abonosPaginaActual < 1) window.abonosPaginaActual = 1;

    const startIdx = (window.abonosPaginaActual - 1) * tamanoPaginaAbonos;
    const endIdx = startIdx + tamanoPaginaAbonos;
    const abonosPagina = window.abonosHistorialGlobal.slice(startIdx, endIdx);

    if (abonosPagina.length === 0) {
        listaAbonos.innerHTML = '<li class="list-group-item text-muted text-center py-3"><small>No hay abonos registrados aún para este equipo.</small></li>';
    } else {
        abonosPagina.forEach((abono) => {
            listaAbonos.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-cash-coin text-success me-2"></i>$${Number(abono.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    <span class="badge bg-light text-secondary rounded-pill">${abono.fecha}</span>
                </li>`;
        });
    }

    const txtPag = document.getElementById('txtAbonosPagina');
    if (txtPag) txtPag.innerText = `Pág. ${window.abonosPaginaActual} de ${totalPaginasAbonos}`;
    const btnAnt = document.getElementById('btnAbonosAnt');
    if (btnAnt) btnAnt.disabled = (window.abonosPaginaActual === 1);
    const btnSig = document.getElementById('btnAbonosSig');
    if (btnSig) btnSig.disabled = (window.abonosPaginaActual >= totalPaginasAbonos);

    const precioTotalVenta = window.abonosTotalVentaGlobal;
    document.getElementById('abonoTotalVenta').value = precioTotalVenta;
    document.getElementById('abonoTotalAbonado').value = totalAbonado;
    document.getElementById('abonoSaldoRestante').value = precioTotalVenta - totalAbonado;
    document.getElementById('abonoNuevoMonto').value = '';
    document.getElementById('abonoNuevoFecha').value = new Date().toISOString().split('T')[0];
};

window.abonosPaginaAnterior = () => {
    if (window.abonosPaginaActual > 1) {
        window.abonosPaginaActual--;
        window.renderizarAbonosUI();
    }
};

window.abonosPaginaSiguiente = () => {
    const tamanoPaginaAbonos = 5;
    const totalPaginasAbonos = Math.max(1, Math.ceil(window.abonosHistorialGlobal.length / tamanoPaginaAbonos));
    if (window.abonosPaginaActual < totalPaginasAbonos) {
        window.abonosPaginaActual++;
        window.renderizarAbonosUI();
    }
};

window.abrirAbonos = async (serie) => {
    try {
        window.serieAbonoActiva = serie;
        window.abonosPaginaActual = 1;

        modalLoading.show();
        await cargarAbonosUI(serie);

        modalLoading.hide();

        const modalAbonos = new bootstrap.Modal(document.getElementById('modalAbonos'));
        modalAbonos.show();
    } catch (error) {
        modalLoading.hide();
        console.log("Error al abrir ventana de abonos", error);
    }
};

window.registrarAbonoModal = async () => {
    const montoInput = document.getElementById('abonoNuevoMonto').value;
    const fechaInput = document.getElementById('abonoNuevoFecha').value;
    const serie = window.serieAbonoActiva;

    if (!montoInput || !fechaInput) {
        Swal.fire({
            title: "Campos Incompletos",
            text: "Por favor, ingresa el monto y la fecha del abono.",
            icon: "warning"
        });
        return;
    }

    const monto = Number(montoInput);
    if (monto <= 0) {
        Swal.fire({
            title: "Monto Inválido",
            text: "El monto del abono debe ser mayor a 0.",
            icon: "warning"
        });
        return;
    }

    const btnAbonar = document.getElementById('btnRegistrarAbono');

    try {
        btnAbonar.disabled = true;
        btnAbonar.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Procesando...';

        const docRef = doc(db, 'almacen', serie);
        const snap = await getDoc(docRef);
        const data = snap.data();

        const historialPrevio = data.historialAbonos || [];

        const nuevoHistorial = [...historialPrevio, {
            monto: monto,
            fecha: fechaInput,
            fechaRegistro: new Date()
        }];

        const updateFields = { historialAbonos: nuevoHistorial };

        const tipoPrecioGuardado = data.tipoPrecioAbono || 'publico';
        const precioTotalVenta = tipoPrecioGuardado === 'publico' ? (Number(data.precioPublico) || 0) : (Number(data.precioMayorista) || 0);
        const totalAbonado = nuevoHistorial.reduce((sum, item) => sum + Number(item.monto), 0);
        const saldoRestante = precioTotalVenta - totalAbonado;

        if (saldoRestante <= 0 && data.estatus !== 'Vendido') {
            const resultEstatus = await Swal.fire({
                title: "¿Cambiar estatus a Vendido?",
                text: "El saldo restante de este equipo ha sido liquidado. ¿Deseas actualizar automáticamente su estatus a 'Vendido'?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Sí, cambiar estatus",
                cancelButtonText: "No, conservar estatus actual",
                confirmButtonColor: "#198754",
                cancelButtonColor: "#6c757d"
            });

            if (resultEstatus.isConfirmed) {
                updateFields.estatus = 'Vendido';
                updateFields.fechaPago = data.fechaPago || fechaInput;
                updateFields.fechaMovimiento = new Date();
                updateFields.ultimoMovimiento = "Liquidación de abonos - Estatus Vendido";

                const nuevoHistorialGarantia = window.procesarTransicionGarantia(data, 'Vendido', new Date(), updateFields.ultimoMovimiento);
                if (nuevoHistorialGarantia) {
                    updateFields.historialGarantias = nuevoHistorialGarantia;
                }
            }
        }

        await updateDoc(docRef, updateFields);

        const index = window.inventarioGlobal.findIndex(item => item.serie === serie);
        if (index !== -1) {
            window.inventarioGlobal[index] = { ...window.inventarioGlobal[index], ...updateFields };
        }

        const totalPaginasAbonos = Math.max(1, Math.ceil(nuevoHistorial.length / 5));
        window.abonosPaginaActual = totalPaginasAbonos;

        await cargarAbonosUI(serie);

        cargarInventario('inicio', false);

    } catch (error) {
        console.log("Error al registrar abono", error);
        Swal.fire({
            title: "Error",
            text: "Ocurrió un error al guardar el abono.",
            icon: "error"
        });
    } finally {
        btnAbonar.disabled = false;
        btnAbonar.innerHTML = '<i class="fa-solid fa-plus me-1"></i>';
    }
};

window.limpiarBuscador = () => {
    document.getElementById('buscadorGeneral').value = '';
    cargarInventario('inicio', false);
    if (typeof window.scrollToTop === 'function') {
        window.scrollToTop();
    }
};

window.limpiarBuscadorModelos = () => {
    document.getElementById('buscadorModelos').value = '';
    window.abrirResumenModelos(false);
    if (typeof window.scrollToTop === 'function') {
        window.scrollToTop();
    }
};

window.deseleccionarItems = () => {
    const checkboxes = document.querySelectorAll('.form-check-input:checked');
    checkboxes.forEach(check => {
        check.checked = false;
        const tr = check.closest('tr');
        if (tr) {
            tr.style.backgroundColor = '';
            tr.style.removeProperty('--bs-table-bg');
            tr.style.color = '';
            tr.style.removeProperty('--bs-table-color');
            tr.style.removeProperty('--bs-table-striped-color');
            tr.style.removeProperty('--bs-table-hover-color');
        }
    });
    const chkSelectAll = document.getElementById('chkSelectAll');
    if (chkSelectAll) chkSelectAll.checked = false;

    window.cerrarDropdownAcciones();
    const btnAcciones = document.getElementById('btnAccionesMultiples');
    if (btnAcciones) {
        btnAcciones.disabled = true;
        btnAcciones.innerHTML = `<i class="bi bi-list-check"></i> Acciones `;
    }
    const badgeContenedor = document.getElementById('badgeContenedor');
    if (badgeContenedor) {
        const count = 0;
        badgeContenedor.innerText = count;
        badgeContenedor.style.display = count > 0 ? 'inline-block' : 'none';
    }
    window.seriesSeleccionadasGlobal.clear();
    window.seleccionGlobal = false;
};

window.scrollToTableHeader = () => {
    const el = document.getElementById('cabeceraTabla');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};



window.generarPDFActaEntrega = async (datosGenerales, equipos) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const emisorSeleccionado = (datosGenerales && datosGenerales.emisor) ? datosGenerales.emisor : document.getElementById('regEmisorActa').value;

    const logo = new Image();
    logo.src = '/img/PROSEINET-LOGO-PDFs.png';
    await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve;
    });

    const logoJJ = new Image();
    logoJJ.src = '/img/PROSEINET-LOGO-V2.png';
    await new Promise((resolve) => {
        logoJJ.onload = resolve;
        logoJJ.onerror = resolve;
    });

    if (emisorSeleccionado === 'dueño' && logoJJ.complete && logoJJ.naturalWidth !== 0) {
        pdf.addImage(logoJJ, 'PNG', 155, -3, 44, 48, undefined, 'FAST');
    } else if (logo.complete && logo.naturalWidth !== 0) {
        pdf.addImage(logo, 'PNG', 155, -3, 44, 48, undefined, 'FAST');
    }

    if (emisorSeleccionado === 'proseinet') {
        pdf.setFillColor(200, 20, 20);
        pdf.rect(10, 10, 90, 23, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("PROSEINET S.A.S. de C.V.", 12, 20);
        pdf.setFontSize(12);
        pdf.text("RFC: PRO1811056Y6", 12, 26);
    } else if (emisorSeleccionado === 'dueño') {
        pdf.setFillColor(120, 72, 150);
        pdf.rect(10, 10, 90, 23, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text("Juan José Arreola Bucio", 12, 20);
        pdf.setFontSize(12);
        pdf.text("RFC: AEBJ88090977A", 12, 26);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(10, 35, 135, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text("ACTA DE ENTREGA - RECEPCIÓN DE EQUIPO DE CÓMPUTO", 15, 42, { align: "left" });
    if (emisorSeleccionado === 'proseinet') {
        pdf.setFillColor(200, 20, 20);
    } else if (emisorSeleccionado === 'dueño') {
        pdf.setFillColor(120, 72, 150);
    }
    pdf.rect(146, 35, 60, 12, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(datosGenerales.folio || "AE-000-XX", 175, 42, { align: "center" });

    if (emisorSeleccionado === 'proseinet') {
        pdf.autoTable({
            startY: 50,
            margin: { left: 10, right: 10 },
            theme: 'grid',
            head: [[{ content: '1. DATOS GENERALES', colSpan: 2, styles: { fillColor: [200, 20, 20], textColor: 255, halign: 'left' } }]],
            body: [
                ['Folio', datosGenerales.folio || 'N/A'],
                ['Fecha de entrega', datosGenerales.fecha || 'N/A'],
                ['Cliente / Razón social', datosGenerales.cliente || 'N/A'],
                ['RFC', datosGenerales.rfc || 'N/A'],
                ['Domicilio / lugar de entrega', datosGenerales.domicilio || 'N/A'],
                ['Contacto, teléfono y correo', datosGenerales.contacto || 'N/A'],
                ['Cotización / Factura / Orden de compra', datosGenerales.referencia || 'N/A']
            ],
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 },
                1: { cellWidth: 'auto', textColor: 0 }
            },
            styles: { fontSize: 9, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1 }
        });
    } else if (emisorSeleccionado === 'dueño') {
        pdf.autoTable({
            startY: 50,
            margin: { left: 10, right: 10 },
            theme: 'grid',
            head: [[{ content: '1. DATOS GENERALES', colSpan: 2, styles: { fillColor: [120, 72, 150], textColor: 255, halign: 'left' } }]],
            body: [
                ['Folio', datosGenerales.folio || 'N/A'],
                ['Fecha de entrega', datosGenerales.fecha || 'N/A'],
                ['Cliente / Razón social', datosGenerales.cliente || 'N/A'],
                ['RFC', datosGenerales.rfc || 'N/A'],
                ['Domicilio / lugar de entrega', datosGenerales.domicilio || 'N/A'],
                ['Contacto, teléfono y correo', datosGenerales.contacto || 'N/A'],
                ['Cotización / Factura / Orden de compra', datosGenerales.referencia || 'N/A']
            ],
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 },
                1: { cellWidth: 'auto', textColor: 0 }
            },
            styles: { fontSize: 9, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1 }
        });
    }

    const tablaEquipos = equipos.map((eq, index) => {
        let specs = eq.especificaciones;
        if (!specs) {
            const parts = [];
            if (eq.procesador) parts.push(`${eq.procesador} ${eq.generacion || ''}`.trim());
            if (eq.ram) parts.push(`RAM: ${eq.ram} ${eq.tipoRam || ''}`.trim());
            if (eq.ssd || eq.hdd) parts.push(`Almacenamiento: SSD ${eq.ssd || 'No'} / HDD ${eq.hdd || 'No'}`.trim());
            if (eq.descVideo && eq.descVideo !== 'Integrados') parts.push(`Video: ${eq.descVideo}`.trim());
            if (eq.os) parts.push(`OS: ${eq.os}`.trim());
            specs = parts.join('\n') || 'N/A';
        }

        return [
            index + 1,
            eq.categoria || eq.tipo || 'N/A',
            eq.marca || 'N/A',
            eq.modelo || 'N/A',
            eq.serie || 'N/A',
            specs,
            eq.condicion || eq.estatus || 'N/A',
            datosGenerales.tiempoGarantia || 'N/A'
        ];
    });

    if (emisorSeleccionado === 'proseinet') {
        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY + 5,
            margin: { bottom: 40, left: 10, right: 10 },
            theme: 'grid',
            head: [[
                { content: '2. RELACIÓN DE EQUIPOS ENTREGADOS', colSpan: 8, styles: { fillColor: [200, 20, 20], textColor: 255, halign: 'left' } }
            ], [
                'No.', 'Tipo', 'Marca', 'Modelo', 'Serie / Asset', 'Especificaciones', 'Condición', 'Garantía'
            ]],
            body: tablaEquipos,
            headStyles: { fillColor: [150, 150, 150], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 1.5, textColor: 0, lineColor: [150, 150, 150], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                4: { fontStyle: 'bold' },
                5: { cellWidth: 55 }
            }
        });
    } else if (emisorSeleccionado === 'dueño') {
        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY + 5,
            margin: { left: 10, right: 10, bottom: 30 },
            theme: 'grid',
            head: [[
                { content: '2. RELACIÓN DE EQUIPOS ENTREGADOS', colSpan: 8, styles: { fillColor: [120, 72, 150], textColor: 255, halign: 'left' } }
            ], [
                'No.', 'Tipo', 'Marca', 'Modelo', 'Serie / Asset', 'Especificaciones', 'Condición', 'Garantía'
            ]],
            body: tablaEquipos,
            headStyles: { fillColor: [150, 150, 150], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 1.5, textColor: 0, lineColor: [150, 150, 150], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                4: { fontStyle: 'bold' },
                5: { cellWidth: 55 }
            }
        });
    }

    if (emisorSeleccionado === 'proseinet') {
        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY + 5,
            margin: { left: 10, right: 10, bottom: 30 },
            theme: 'plain',
            body: [
                [{ content: '3. ALCANCE DE LA GARANTÍA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [200, 20, 20] } }],
                ['3.1 Cobertura. La garantía cubre exclusivamente fallas de funcionamiento atribuibles a componentes de hardware suministrados por PROSEINET siempre que el equipo haya sido utilizado conforme a su naturaleza, especificaciones y condiciones normales de operación.'],
                ['3.2 Solución. Después del diagnóstico técnico, PROSEINET podrá, a su elección, reparar el equipo, sustituir el componente afectado o reemplazarlo por otro de características iguales o equivalentes. La sustitución no implica necesariamente la entrega de un equipo nuevo.'],
                ['3.3 Tiempo de atención. El plazo de diagnóstico y solución dependerá de la naturaleza de la falla y de la disponibilidad de refacciones con fabricante. PROSEINET informará al cliente el resultado de la revisión y el procedimiento aplicable.'],

                [{ content: '\n4. EXCLUSIONES', styles: { fontStyle: 'bold', fontSize: 10, textColor: [200, 20, 20] } }],
                ['• Golpes, caídas, fracturas, presión, humedad, derrame de líquidos, corrosión, incendio o exposición a temperaturas inadecuadas.\n• Daños causados por variaciones de voltaje, descargas eléctricas, cargadores incompatibles, instalaciones deficientes o falta de regulador/UPS cuando sea recomendable.\n• Apertura, reparación, alteración, cambio de componentes, sellos o configuraciones por personal no autorizado por PROSEINET.\n• Fallas derivadas de software, virus, malware, pérdida de información, contraseñas, configuraciones, actualizaciones o incompatibilidades no atribuibles al hardware entregado.\n• Daños por uso distinto al previsto, negligencia, transporte inadecuado, plagas, polvo excesivo o falta de mantenimiento.\n• Pérdida o alteración del número de serie, etiqueta de activo, sello de garantía o comprobante de compra.'],

                [{ content: '\n5. PROCEDIMIENTO PARA SOLICITAR GARANTÍA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [200, 20, 20] } }],
                ['1. Notificar la falla y proporcionar, número de serie, factura o acta de entrega.\n2. Respaldar previamente la información. PROSEINET no será responsable por pérdida de datos.\n3. Entregar el equipo completo con sus accesorios indispensables para la prueba.\n4. Permitir la revisión técnica. La recepción del equipo no implica aceptación automática de la reclamación.\n5. Si la falla no está cubierta, el diagnóstico o reparación podrá cotizarse por separado, previa autorización del cliente.'],

                [{ content: '\n6. ACEPTACIÓN', styles: { fontStyle: 'bold', fontSize: 10, textColor: [200, 20, 20] } }],
                ['La presente carta complementa la factura, cotización, remisión, contrato y/o acta de entrega correspondientes. En caso de existir condiciones particulares acordadas por escrito, prevalecerán dichas condiciones exclusivamente respecto de los equipos expresamente identificados. El cliente manifiesta haber leído y aceptado el alcance, procedimiento y exclusiones aquí señalados.']
            ],
            styles: { fontSize: 8, textColor: [40, 40, 40], cellPadding: 1 }
        });
    } else if (emisorSeleccionado === 'dueño') {
        pdf.autoTable({
            startY: pdf.lastAutoTable.finalY + 5,
            margin: { left: 10, right: 10, bottom: 30 },
            theme: 'plain',
            body: [
                [{ content: '3. ALCANCE DE LA GARANTÍA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [120, 72, 150] } }],
                ['3.1 Cobertura. La garantía cubre exclusivamente fallas de funcionamiento atribuibles a componentes de hardware suministrados por PROSEINET siempre que el equipo haya sido utilizado conforme a su naturaleza, especificaciones y condiciones normales de operación.'],
                ['3.2 Solución. Después del diagnóstico técnico, PROSEINET podrá, a su elección, reparar el equipo, sustituir el componente afectado o reemplazarlo por otro de características iguales o equivalentes. La sustitución no implica necesariamente la entrega de un equipo nuevo.'],
                ['3.3 Tiempo de atención. El plazo de diagnóstico y solución dependerá de la naturaleza de la falla y de la disponibilidad de refacciones con fabricante. PROSEINET informará al cliente el resultado de la revisión y el procedimiento aplicable.'],

                [{ content: '\n4. EXCLUSIONES', styles: { fontStyle: 'bold', fontSize: 10, textColor: [120, 72, 150] } }],
                ['• Golpes, caídas, fracturas, presión, humedad, derrame de líquidos, corrosión, incendio o exposición a temperaturas inadecuadas.\n• Daños causados por variaciones de voltaje, descargas eléctricas, cargadores incompatibles, instalaciones deficientes o falta de regulador/UPS cuando sea recomendable.\n• Apertura, reparación, alteración, cambio de componentes, sellos o configuraciones por personal no autorizado por PROSEINET.\n• Fallas derivadas de software, virus, malware, pérdida de información, contraseñas, configuraciones, actualizaciones o incompatibilidades no atribuibles al hardware entregado.\n• Daños por uso distinto al previsto, negligencia, transporte inadecuado, plagas, polvo excesivo o falta de mantenimiento.\n• Pérdida o alteración del número de serie, etiqueta de activo, sello de garantía o comprobante de compra.'],

                [{ content: '\n5. PROCEDIMIENTO PARA SOLICITAR GARANTÍA', styles: { fontStyle: 'bold', fontSize: 10, textColor: [120, 72, 150] } }],
                ['1. Notificar la falla y proporcionar, número de serie, factura o acta de entrega.\n2. Respaldar previamente la información. PROSEINET no será responsable por pérdida de datos.\n3. Entregar el equipo completo con sus accesorios indispensables para la prueba.\n4. Permitir la revisión técnica. La recepción del equipo no implica aceptación automática de la reclamación.\n5. Si la falla no está cubierta, el diagnóstico o reparación podrá cotizarse por separado, previa autorización del cliente.'],

                [{ content: '\n6. ACEPTACIÓN', styles: { fontStyle: 'bold', fontSize: 10, textColor: [120, 72, 150] } }],
                ['La presente carta complementa la factura, cotización, remisión, contrato y/o acta de entrega correspondientes. En caso de existir condiciones particulares acordadas por escrito, prevalecerán dichas condiciones exclusivamente respecto de los equipos expresamente identificados. El cliente manifiesta haber leído y aceptado el alcance, procedimiento y exclusiones aquí señalados.']
            ],
            styles: { fontSize: 8, textColor: [40, 40, 40], cellPadding: 1 }
        });
    }

    let finalY = pdf.lastAutoTable.finalY + 40;
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (finalY + 45 > pageHeight) {
        pdf.addPage();
        finalY = 40;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");

    pdf.line(20, finalY, 90, finalY);
    pdf.text("ENTREGA - PROSEINET", 55, finalY + 5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("JUAN JOSÉ ARREOLA BUCIO", 55, finalY + 10, { align: "center" });
    pdf.text("Cargo: Director General", 55, finalY + 15, { align: "center" });
    pdf.text(`Fecha: ${datosGenerales.fecha || '____ / ____ / ______'}`, 55, finalY + 20, { align: "center" });

    pdf.setFont("helvetica", "bold");
    pdf.line(125, finalY, 195, finalY);
    pdf.text("RECIBE - CLIENTE", 160, finalY + 5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text(datosGenerales.clienteFirma || "______________________________", 160, finalY + 10, { align: "center" });
    pdf.text(`Cargo: ${datosGenerales.cargoCliente || "________________________"}`, 160, finalY + 15, { align: "center" });
    pdf.text(`Fecha: ____ / ____ / ______`, 160, finalY + 20, { align: "center" });

    const logoRedes = new Image();
    logoRedes.src = '/img/redes-pdf.png';
    const logoRedesPromise = new Promise((resolve) => {
        logoRedes.onload = () => resolve(true);
        logoRedes.onerror = () => resolve(false);
    });

    await Promise.all([logoRedesPromise]);

    const footerY = pageHeight - 25;
    const pagesDrawn = new Set();

    const dibujarFooter = (pageNum) => {
        if (pagesDrawn.has(pageNum)) return;
        pagesDrawn.add(pageNum);

        pdf.setFillColor(20, 20, 20);
        pdf.rect(10, footerY, 196, 15, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        if (emisorSeleccionado === 'proseinet') {
            pdf.setFillColor(200, 20, 20);
        } else if (emisorSeleccionado === 'dueño') {
            pdf.setFillColor(120, 72, 150);
        }
        pdf.rect(10, footerY - 5, 50, 5, 'F');
        pdf.setFont("helvetica", "bold");
        pdf.text("https://proseinet.mx/", 12, footerY - 1.5);

        pdf.setFillColor(110, 110, 110);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Gral. Pedro María Anaya #235 Int. 5, Col. Chapultepec Nte. c.p 58260 Morelia, Mich.", 12, footerY + 6);
        pdf.text("Tel: 443 684 3852, 443 273 1724, Correo: proseinet.sas@gmail.com", 12, footerY + 10);

        if (logoRedes.complete && logoRedes.naturalWidth !== 0) {
            pdf.addImage(logoRedes, 'PNG', 135, footerY - 2.5, 60, 20, undefined, 'FAST');
        }
    };

    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        dibujarFooter(i);
    }

    return pdf;
};


function agregarFilaActa(tipo = '', marca = '', modelo = '', serie = '', specs = '', condicion = 'REFURBISHED') {
    if (tipo && typeof tipo === 'object' && tipo.preventDefault) {
        tipo = '';
    }
    const tbody = document.getElementById('cuerpoTablaEquiposActa');
    if (!tbody) return;

    const tr = document.createElement('tr');
    tr.className = 'fila-acta-equipo';
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm acta-tipo" placeholder="Tipo / Cat." value="${tipo || ''}"></td>
        <td><input type="text" class="form-control form-control-sm acta-marca" placeholder="Marca" value="${marca || ''}"></td>
        <td><input type="text" class="form-control form-control-sm acta-modelo" placeholder="Modelo" value="${modelo || ''}"></td>
        <td><input type="text" class="form-control form-control-sm acta-serie" placeholder="Serie / S/N" value="${serie || ''}"></td>
        <td><textarea class="form-control form-control-sm acta-specs" rows="2" placeholder="Procesador, RAM, Almacenamiento, etc.">${specs || ''}</textarea></td>
        <td><input type="text" class="form-control form-control-sm acta-condicion" placeholder="Condición" value="${condicion || 'REFURBISHED'}"></td>
        <td class="text-center align-middle">
            <button type="button" class="btn btn-sm btn-outline-danger border-0 btn-eliminar-fila-acta" title="Eliminar fila">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.btn-eliminar-fila-acta').addEventListener('click', () => {
        tr.remove();
    });
}

const btnAgregarFilaActa = document.getElementById('btnAgregarFilaActa');
if (btnAgregarFilaActa) {
    btnAgregarFilaActa.addEventListener('click', () => agregarFilaActa());
}

const btnBuscarModeloActa = document.getElementById('btnBuscarModeloActa');
if (btnBuscarModeloActa) {
    btnBuscarModeloActa.addEventListener('click', () => {
        window.contextoClonacion = 'acta';
        window.evitarResetModal = true;
        const modalEl = document.getElementById('modalActaEntrega');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        setTimeout(() => {
            const inputBuscador = document.getElementById('buscadorClonar');
            const selectCat = document.getElementById('filtroCategoriaClonar');
            if (inputBuscador) inputBuscador.value = '';
            if (selectCat) selectCat.value = '';
            const tituloClonar = document.querySelector('#modalClonarEquipo .modal-title');
            if (tituloClonar) {
                tituloClonar.innerHTML = `<div class="modal-icon-badge primary"><i class="fa-solid fa-search"></i></div> Buscar Equipos Disponibles`;
            }
            if (!modalClonarEquipoInst) modalClonarEquipoInst = new bootstrap.Modal(document.getElementById('modalClonarEquipo'));
            modalClonarEquipoInst.show();
            renderTablaClonar();
        }, 150);
    });
}

window.generarActaEquiposSeleccionados = async () => {
    window.ultimoOrigenModal = null;
    if (typeof window.cerrarDropdownAcciones === 'function') {
        window.cerrarDropdownAcciones();
    }

    const seleccionados = typeof window.obtenerSeleccionados === 'function' ? window.obtenerSeleccionados() : [];
    const emisorActa = document.getElementById('regEmisorActa')?.value?.trim() || 'proseinet';

    let equiposActa = [];
    if (seleccionados.length > 0) {
        for (let serie of seleccionados) {
            const d = window.inventarioGlobal?.find(item => item.serie === serie);
            if (d) equiposActa.push(d);
        }
    }

    document.getElementById('actaFolio').value = `AE-001-${new Date().getFullYear()}`;
    if (emisorActa === 'dueño') {
        document.getElementById('regEmisorActa').value = 'dueño';
    } else {
        document.getElementById('regEmisorActa').value = 'proseinet';
    }
    document.getElementById('actaCliente').value = (equiposActa.length > 0 && equiposActa[0].cliente) ? equiposActa[0].cliente : '';
    document.getElementById('actaRFC').value = '';
    document.getElementById('actaDomicilio').value = '';
    document.getElementById('actaContacto').value = '';
    document.getElementById('actaReferencia').value = '';
    document.getElementById('actaGarantia').value = '3 a 12 meses';

    const tbody = document.getElementById('cuerpoTablaEquiposActa');
    tbody.innerHTML = '';

    if (equiposActa.length > 0) {
        equiposActa.forEach(eq => {
            let specs = `${eq.procesador || ''} ${eq.generacion || ''}\nRAM: ${eq.ram || ''} ${eq.tipoRam || ''}\nAlmacenamiento: SSD ${eq.ssd || 'No'} / HDD ${eq.hdd || 'No'}`;
            if (eq.descVideo && eq.descVideo !== 'Integrados') specs += `\nVideo: ${eq.descVideo}`;
            if (eq.os) specs += `\nOS: ${eq.os}`;
            agregarFilaActa(
                eq.categoria || 'Equipo',
                eq.marca || '',
                eq.modelo || '',
                eq.serie || '',
                specs.trim(),
                eq.condicion || eq.estatus || 'REFURBISHED'
            );
        });
    } else {
        agregarFilaActa();
    }

    const modalEl = document.getElementById('modalActaEntrega');
    const modalActa = bootstrap.Modal.getOrCreateInstance(modalEl);
    modalActa.show();
};

window._extraerDatosActa = () => {
    const modalA = document.getElementById('modalActaEntrega');
    const esEdicionActa = modalA && modalA.getAttribute('data-modo') === 'editar';
    const fechaISO = esEdicionActa && modalA.getAttribute('data-fecha-original')
        ? modalA.getAttribute('data-fecha-original')
        : new Date().toISOString().split('T')[0];
    const fecha = esEdicionActa && modalA.getAttribute('data-fecha-texto-original')
        ? modalA.getAttribute('data-fecha-texto-original')
        : new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    return {
        folio: document.getElementById('actaFolio').value.trim(),
        emisor: document.getElementById('regEmisorActa').value.trim(),
        cliente: document.getElementById('actaCliente').value.trim(),
        rfc: document.getElementById('actaRFC').value.trim(),
        domicilio: document.getElementById('actaDomicilio').value.trim(),
        contacto: document.getElementById('actaContacto').value.trim(),
        referencia: document.getElementById('actaReferencia').value.trim(),
        tiempoGarantia: document.getElementById('actaGarantia').value.trim(),
        fechaISO,
        fecha
    };
};

window._extraerEquiposActa = () => {
    const filas = document.querySelectorAll('#cuerpoTablaEquiposActa tr.fila-acta-equipo');
    const equipos = [];
    filas.forEach(tr => {
        const tipo = tr.querySelector('.acta-tipo')?.value.trim() || '';
        const marca = tr.querySelector('.acta-marca')?.value.trim() || '';
        const modelo = tr.querySelector('.acta-modelo')?.value.trim() || '';
        const serie = tr.querySelector('.acta-serie')?.value.trim() || '';
        const specs = tr.querySelector('.acta-specs')?.value.trim() || '';
        const condicion = tr.querySelector('.acta-condicion')?.value.trim() || 'REFURBISHED';

        if (tipo || marca || modelo || serie || specs) {
            equipos.push({
                categoria: tipo,
                tipo: tipo,
                marca: marca,
                modelo: modelo,
                serie: serie,
                especificaciones: specs,
                condicion: condicion,
                estatus: condicion
            });
        }
    });
    return equipos;
};

window._guardarActaEnHistorial = async (formValues, equiposActa) => {
    try {
        const folioRef = doc(db, "cotizaciones", formValues.folio);
        const folioSnap = await getDoc(folioRef);
        let folioNum = folioSnap.exists() ? (folioSnap.data().folioNum || 900) : null;
        if (!folioNum) {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snap = await getDocs(q);
            folioNum = snap.empty ? 900 : (snap.docs[0].data().folioNum + 1);
        }
        const actaData = {
            tipo: 'acta',
            folio: formValues.folio,
            folioNum,
            fechaISO: formValues.fechaISO,
            fecha: formValues.fecha,
            emisor: formValues.emisor,
            cliente: formValues.cliente,
            rfc: formValues.rfc,
            domicilio: formValues.domicilio,
            contacto: formValues.contacto,
            referencia: formValues.referencia,
            tiempoGarantia: formValues.tiempoGarantia,
            items: equiposActa,
            ultimaEdicion: new Date()
        };
        await setDoc(folioRef, actaData);
        return true;
    } catch (err) {
        console.error("Error guardando acta en la BD:", err);
        return false;
    }
};

window.descargarPDFActaDirecto = async (folio, soloPrevisualizar = false) => {
    if (typeof modalLoading !== 'undefined') modalLoading.show();
    try {
        const docRef = doc(db, "cotizaciones", folio);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await Swal.fire({
                title: "No Encontrado",
                text: "El registro solicitado no existe.",
                icon: "error"
            });
            if (typeof modalLoading !== 'undefined') modalLoading.hide();
            return;
        }

        const d = snap.data();
        const datosGenerales = {
            folio: d.folio,
            emisor: d.emisor || 'proseinet',
            fecha: d.fechaISO
                ? new Date(d.fechaISO + "T00:00:00").toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
                : (d.fecha || ''),
            cliente: d.cliente || '',
            rfc: d.rfc || '',
            domicilio: d.domicilio || '',
            contacto: d.contacto || '',
            referencia: d.referencia || '',
            tiempoGarantia: d.tiempoGarantia || '3 a 12 meses'
        };
        const equiposActa = (d.items || []).map(eq => ({
            ...eq,
            especificaciones: eq.especificaciones || ''
        }));

        if (document.getElementById('regEmisorActa')) {
            document.getElementById('regEmisorActa').value = datosGenerales.emisor;
        }

        const pdfActa = await window.generarPDFActaEntrega(datosGenerales, equiposActa);

        if (soloPrevisualizar) {
            const blob = pdfActa.output('blob');
            if (activePreviewBlobUrl) {
                URL.revokeObjectURL(activePreviewBlobUrl);
            }
            activePreviewBlobUrl = URL.createObjectURL(blob);
            document.getElementById('iframeVistaPreviaPDF').src = activePreviewBlobUrl;

            window.lastModalOpen = 'historial';
            window.evitarResetModal = true;

            const modalHistorialEl = document.getElementById('modalHistorialCotizaciones');
            if (modalHistorialEl) {
                const inst = bootstrap.Modal.getInstance(modalHistorialEl);
                if (inst) inst.hide();
            }
            modalVistaPreviaPDF.show();
        } else {
            pdfActa.save(`Acta_Entrega_${d.folio}_${(d.cliente || 'General').replace(/\s+/g, '_')}.pdf`);
        }

        if (typeof modalLoading !== 'undefined') modalLoading.hide();
    } catch (error) {
        if (typeof modalLoading !== 'undefined') modalLoading.hide();
        console.error("Error generando acta desde historial:", error);
        await Swal.fire({
            title: "Error",
            text: "Ocurrió un error al generar el PDF del Acta de Entrega.",
            icon: "error"
        });
    }
};

const btnDescargarActaPDF = document.getElementById('btnDescargarActaPDF');
if (btnDescargarActaPDF) {
    btnDescargarActaPDF.addEventListener('click', async () => {
        const formValues = window._extraerDatosActa();
        const equiposActa = window._extraerEquiposActa();

        if (equiposActa.length === 0) {
            return Swal.fire("Sin Equipos", "Debes agregar al menos un equipo o servicio al Acta de Entrega.", "warning");
        }

        try {
            if (typeof modalLoading !== 'undefined') modalLoading.show();

            const pdfActa = await window.generarPDFActaEntrega(formValues, equiposActa);
            pdfActa.save(`Acta_Entrega_${formValues.folio}_${(formValues.cliente || 'General').replace(/\s+/g, '_')}.pdf`);

            await window._guardarActaEnHistorial(formValues, equiposActa);

            if (typeof modalLoading !== 'undefined') modalLoading.hide();

            bootstrap.Modal.getInstance(document.getElementById('modalActaEntrega')).hide();
            Swal.fire("Descargado", "El Acta de Entrega PDF ha sido generada correctamente.", "success");

            const chkSelectAll = document.getElementById('chkSelectAll');
            if (chkSelectAll && chkSelectAll.checked) chkSelectAll.click();

        } catch (error) {
            if (typeof modalLoading !== 'undefined') modalLoading.hide();
            console.error("Error al generar acta PDF:", error);
            Swal.fire("Error", "Ocurrió un error al generar el PDF del Acta de Entrega.", "error");
        }
    });
}

const btnVistaPreviaActa = document.getElementById('btnVistaPreviaActa');
if (btnVistaPreviaActa) {
    btnVistaPreviaActa.addEventListener('click', async () => {
        const formValues = window._extraerDatosActa();
        const equiposActa = window._extraerEquiposActa();

        if (equiposActa.length === 0) {
            return Swal.fire("Sin Equipos", "Debes agregar al menos un equipo o servicio al Acta de Entrega.", "warning");
        }

        try {
            if (typeof modalLoading !== 'undefined') modalLoading.show();

            const pdfActa = await window.generarPDFActaEntrega(formValues, equiposActa);
            const blob = pdfActa.output('blob');

            await window._guardarActaEnHistorial(formValues, equiposActa);

            if (activePreviewBlobUrl) {
                URL.revokeObjectURL(activePreviewBlobUrl);
            }

            activePreviewBlobUrl = URL.createObjectURL(blob);
            document.getElementById('iframeVistaPreviaPDF').src = activePreviewBlobUrl;

            if (typeof modalLoading !== 'undefined') modalLoading.hide();

            window.lastModalOpen = 'acta';
            window.evitarResetModal = true;
            const actaModalEl = document.getElementById('modalActaEntrega');
            if (actaModalEl) {
                const inst = bootstrap.Modal.getInstance(actaModalEl);
                if (inst) inst.hide();
            }
            modalVistaPreviaPDF.show();

        } catch (error) {
            if (typeof modalLoading !== 'undefined') modalLoading.hide();
            console.error("Error al generar acta PDF:", error);
            Swal.fire("Error", "Ocurrió un error al generar el PDF del Acta de Entrega.", "error");
        }
    });
}

const modalActaEntregaEl = document.getElementById('modalActaEntrega');
if (modalActaEntregaEl) {
    modalActaEntregaEl.addEventListener('hidden.bs.modal', () => {
        if (window.evitarResetModal) {
            window.evitarResetModal = false;
            return;
        }

        modalActaEntregaEl.removeAttribute('data-modo');
        modalActaEntregaEl.removeAttribute('data-folio-original');
        modalActaEntregaEl.removeAttribute('data-folio-num-original');
        modalActaEntregaEl.removeAttribute('data-fecha-original');
        modalActaEntregaEl.removeAttribute('data-fecha-texto-original');

        const tituloModalActa = document.getElementById('tituloModalActa');
        if (tituloModalActa) {
            tituloModalActa.innerText = 'Acta de Entrega';
        }

        if (window.ultimoOrigenModal === 'historial') {
            window.ultimoOrigenModal = null;
            setTimeout(() => {
                new bootstrap.Modal(document.getElementById('modalHistorialCotizaciones')).show();
            }, 300);
        }
    });
}

window.editarActa = async (folio, esDuplicado = false) => {
    window.ultimoOrigenModal = 'historial';
    if (typeof modalLoading !== 'undefined') modalLoading.show();
    try {
        const docRef = doc(db, "cotizaciones", folio);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await Swal.fire({
                title: "No Encontrado",
                text: "El registro solicitado no existe.",
                icon: "error"
            });
            if (typeof modalLoading !== 'undefined') modalLoading.hide();
            return;
        }
        const d = snap.data();

        document.getElementById('actaFolio').value = d.folio || '';
        document.getElementById('regEmisorActa').value = d.emisor || 'proseinet';
        document.getElementById('actaCliente').value = d.cliente || '';
        document.getElementById('actaRFC').value = d.rfc || '';
        document.getElementById('actaDomicilio').value = d.domicilio || '';
        document.getElementById('actaContacto').value = d.contacto || '';
        document.getElementById('actaReferencia').value = d.referencia || '';
        document.getElementById('actaGarantia').value = d.tiempoGarantia || '3 a 12 meses';

        const tbody = document.getElementById('cuerpoTablaEquiposActa');
        tbody.innerHTML = '';
        if ((d.items || []).length > 0) {
            d.items.forEach(eq => {
                agregarFilaActa(
                    eq.categoria || eq.tipo || '',
                    eq.marca || '',
                    eq.modelo || '',
                    eq.serie || '',
                    eq.especificaciones || '',
                    eq.condicion || eq.estatus || 'REFURBISHED'
                );
            });
        } else {
            agregarFilaActa();
        }

        const modalEl = document.getElementById('modalActaEntrega');
        const tituloModalActa = document.getElementById('tituloModalActa');

        if (esDuplicado) {
            const q = query(collection(db, "cotizaciones"), orderBy("folioNum", "desc"), limit(1));
            const snapList = await getDocs(q);
            let nextFolioNum = 1;
            if (!snapList.empty) {
                nextFolioNum = snapList.docs[0].data().folioNum + 1;
            }
            document.getElementById('actaFolio').value = `AE-${String(nextFolioNum).padStart(3, '0')}-${new Date().getFullYear()}`;

            if (modalEl) {
                modalEl.removeAttribute('data-modo');
                modalEl.removeAttribute('data-folio-original');
                modalEl.removeAttribute('data-folio-num-original');
                modalEl.removeAttribute('data-fecha-original');
                modalEl.removeAttribute('data-fecha-texto-original');
            }
            if (tituloModalActa) {
                tituloModalActa.innerText = 'Reconstruir Acta de Entrega';
            }
        } else {
            if (modalEl) {
                modalEl.setAttribute('data-modo', 'editar');
                modalEl.setAttribute('data-folio-original', folio);
                modalEl.setAttribute('data-folio-num-original', d.folioNum || 1);
                modalEl.setAttribute('data-fecha-original', d.fechaISO || '');
                modalEl.setAttribute('data-fecha-texto-original', d.fecha || '');
            }
            if (tituloModalActa) {
                tituloModalActa.innerText = 'Editar Acta de Entrega';
            }
        }

        if (typeof modalLoading !== 'undefined') modalLoading.hide();
        const modalHistorialEl = document.getElementById('modalHistorialCotizaciones');
        if (modalHistorialEl) {
            const inst = bootstrap.Modal.getInstance(modalHistorialEl);
            if (inst) inst.hide();
        }
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalActaEntrega')).show();
    } catch (error) {
        if (typeof modalLoading !== 'undefined') modalLoading.hide();
        console.error("Error al editar acta:", error);
    }
};

window.reconstruirActa = async (folio) => {
    await window.editarActa(folio, true);
};

window.generarPDFStockResumen = async (modelos, infoFiltros = {}) => {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'letter',
        compress: true
    });

    const logo = new Image();
    logo.src = '/img/PROSEINET-LOGO-PDFs.png';
    await new Promise((resolve) => {
        logo.onload = resolve;
        logo.onerror = resolve;
    });

    if (logo.complete && logo.naturalWidth !== 0) {
        pdf.addImage(logo, 'PNG', 155, -3, 44, 48, undefined, 'FAST');
    }

    pdf.setFillColor(200, 20, 20);
    pdf.rect(10, 10, 90, 23, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("PROSEINET S.A.S. de C.V.", 12, 20);
    pdf.setFontSize(12);
    pdf.text("RFC: PRO1811056Y6", 12, 26);

    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const folioStr = `STK-${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}`;
    const fechaHoraStr = `${pad(ahora.getDate())}/${pad(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setFillColor(0, 0, 0);
    pdf.rect(10, 35, 135, 12, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.text("REPORTE DE STOCK DISPONIBLE DE EQUIPOS", 15, 42, { align: "left" });
    pdf.setFillColor(200, 20, 20);
    pdf.rect(146, 35, 60, 12, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(folioStr, 175, 42, { align: "center" });

    let modelosProcesados = [...modelos];
    if (!infoFiltros.categoria || infoFiltros.categoria === 'Todas') {
        modelosProcesados.sort((a, b) => {
            const catA = String(a.categoria || 'Z').trim();
            const catB = String(b.categoria || 'Z').trim();
            const resCat = catA.localeCompare(catB, 'es', { sensitivity: 'base' });
            if (resCat !== 0) return resCat;
            if ((b.existencia || 0) !== (a.existencia || 0)) return (b.existencia || 0) - (a.existencia || 0);
            return (a.marcaModelo || '').localeCompare(b.marcaModelo || '', 'es', { sensitivity: 'base' });
        });
    }

    const totalExistencias = modelosProcesados.reduce((acc, m) => acc + (Number(m.existencia) || 0), 0);

    pdf.autoTable({
        startY: 50,
        margin: { left: 10, right: 10 },
        theme: 'grid',
        head: [[{ content: '1. DATOS GENERALES DEL REPORTE', colSpan: 2, styles: { fillColor: [200, 20, 20], textColor: 255, halign: 'left' } }]],
        body: [
            ['Folio de Reporte', folioStr],
            ['Fecha y Hora de Emisión', fechaHoraStr],
            ['Generado Por', infoFiltros.usuario || 'Sistema Almacén'],
            ['Filtro de Categoría', infoFiltros.categoria || 'Todas'],
            ['Filtro de Condición', infoFiltros.condicion || 'Todas'],
            ['Filtro de Búsqueda', infoFiltros.busqueda || 'Sin filtro'],
            ['Total de Modelos Listados', `${modelosProcesados.length} modelos`],
            ['Total de Equipos Disponibles', `${totalExistencias} unidades en stock`]
        ],
        columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold', fillColor: [240, 240, 240], textColor: 0 },
            1: { cellWidth: 'auto', textColor: 0 }
        },
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [150, 150, 150], lineWidth: 0.1 }
    });

    const tablaFilas = modelosProcesados.map((m, index) => {
        return [
            index + 1,
            m.marcaModelo || 'N/A',
            m.categoria || 'N/A',
            `${m.procesador || ''} ${m.generacion || ''}`.trim(),
            `${m.ram || ''} ${m.tipoRam || ''}`.trim(),
            m.almacenamiento || 'N/A',
            m.condicion || 'N/A',
            m.existencia ?? 0
        ];
    });

    pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 5,
        margin: { bottom: 40, left: 10, right: 10 },
        theme: 'grid',
        head: [[
            { content: '2. RELACIÓN DE STOCK DISPONIBLE POR MODELO', colSpan: 8, styles: { fillColor: [200, 20, 20], textColor: 255, halign: 'left' } }
        ], [
            'No.', 'Marca y Modelo', 'Categoría', 'Procesador', 'RAM', 'Almacenamiento', 'Condición', 'En Stock'
        ]],
        body: tablaFilas,
        foot: [[
            { content: 'TOTAL EQUIPOS DISPONIBLES EN STOCK', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fillColor: [230, 230, 230] } },
            { content: String(totalExistencias), styles: { halign: 'center', fontStyle: 'bold', fillColor: [200, 20, 20], textColor: 255 } }
        ]],
        headStyles: { fillColor: [150, 150, 150], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 6.5, cellPadding: 2, textColor: 0, lineColor: [150, 150, 150], lineWidth: 0.1 },
        columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 42, fontStyle: 'bold' },
            2: { cellWidth: 22 },
            3: { cellWidth: 35 },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 32, halign: 'center' },
            6: { cellWidth: 21, halign: 'center' },
            7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
        }
    });

    let finalY = pdf.lastAutoTable.finalY + 25;
    const pageHeight = pdf.internal.pageSize.getHeight();
    if (finalY + 40 > pageHeight) {
        pdf.addPage();
        finalY = 40;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(0);
    pdf.setFont("helvetica", "bold");
    /*
        pdf.line(20, finalY, 90, finalY);
        pdf.text("GENERADO Y EMITIDO POR", 55, finalY + 5, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.text(infoFiltros.usuario || "SISTEMA PROSEINET", 55, finalY + 10, { align: "center" });
        pdf.text(`Fecha: ${fechaHoraStr.split(' ')[0]}`, 55, finalY + 15, { align: "center" }); */

    /*
    pdf.setFont("helvetica", "bold");
    pdf.line(125, finalY, 195, finalY);
    pdf.text("RESPONSABLE DE ALMACÉN / INVENTARIOS", 160, finalY + 5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.text("______________________________", 160, finalY + 10, { align: "center" });
    pdf.text("Firma de Conformidad", 160, finalY + 15, { align: "center" }); */

    const logoRedes = new Image();
    logoRedes.src = '/img/redes-pdf.png';
    await new Promise((resolve) => {
        logoRedes.onload = () => resolve(true);
        logoRedes.onerror = () => resolve(false);
    });

    const footerY = pageHeight - 25;
    const pagesDrawn = new Set();

    const dibujarFooter = (pageNum) => {
        if (pagesDrawn.has(pageNum)) return;
        pagesDrawn.add(pageNum);

        pdf.setFillColor(20, 20, 20);
        pdf.rect(10, footerY, 196, 15, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFillColor(200, 20, 20);
        pdf.rect(10, footerY - 5, 50, 5, 'F');
        pdf.setFont("helvetica", "bold");
        pdf.text("https://proseinet.mx/", 12, footerY - 1.5);

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.text("Gral. Pedro María Anaya #235 Int. 5, Col. Chapultepec Nte. c.p 58260 Morelia, Mich.", 12, footerY + 6);
        pdf.text("Tel: 443 684 3852, 443 273 1724, Correo: proseinet.sas@gmail.com", 12, footerY + 10);

        if (logoRedes.complete && logoRedes.naturalWidth !== 0) {
            pdf.addImage(logoRedes, 'PNG', 135, footerY - 2.5, 60, 20, undefined, 'FAST');
        }
    };

    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        dibujarFooter(i);
    }

    return pdf;
};

document.addEventListener('click', async (e) => {
    const btnExportar = e.target.closest('#btnExportarStock');
    if (btnExportar) {
        e.preventDefault();

        const buscador = document.getElementById('buscadorModelos');
        const filtroCat = document.getElementById('filtroCategoriaStock');
        const filtroCond = document.getElementById('filtroCondicionStock');

        const termino = buscador ? buscador.value.trim().toLowerCase() : '';
        const catVal = filtroCat ? filtroCat.value : '';
        const condVal = filtroCond ? filtroCond.value : '';

        const terminos = termino ? termino.split(/\s+/).filter(t => t.length > 0) : [];
        const filtrados = (window.modelosAgrupadosCache || []).filter(item => {
            let coincideTexto = true;
            if (terminos.length > 0) {
                const ramRaw = String(item.ram || '').toLowerCase();
                const ramSinEspacios = ramRaw.replace(/\s+/g, '');
                const textoCompleto = `${item.marcaModelo || ''} ${item.categoria || ''} ${item.procesador || ''} ${item.generacion || ''} ${ramRaw} ${ramSinEspacios} ${item.tipoRam || ''} ${item.almacenamiento || ''} ${item.condicion || ''}`.toLowerCase();
                coincideTexto = terminos.every(t => textoCompleto.includes(t));
            }
            const coincideCat = !catVal || item.categoria === catVal;
            const coincideCond = !condVal || item.condicion.toLowerCase() === condVal.toLowerCase();
            return coincideTexto && coincideCat && coincideCond;
        });

        if (filtrados.length === 0) {
            Swal.fire("Sin Datos", "No hay modelos disponibles para exportar con los filtros seleccionados.", "warning");
            return;
        }

        try {
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espera un momento.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const txtNombrePerfil = document.getElementById('txtNombrePerfil');
            const infoFiltros = {
                categoria: catVal || 'Todas',
                condicion: condVal || 'Todas',
                busqueda: termino || 'Sin filtro',
                usuario: txtNombrePerfil ? txtNombrePerfil.innerText : 'Usuario Sistema'
            };

            const pdf = await window.generarPDFStockResumen(filtrados, infoFiltros);
            const fechaHoy = new Date().toISOString().split('T')[0];
            pdf.save(`Reporte_Stock_Disponible_${fechaHoy}.pdf`);

            Swal.fire("Éxito", "El reporte en PDF del stock disponible ha sido generado correctamente.", "success");
        } catch (error) {
            console.error("Error al exportar PDF de stock:", error);
            Swal.fire("Error", "Ocurrió un error al generar el documento PDF.", "error");
        }
    }
});