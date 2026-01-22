const express = require('express');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- IMPORTAMOS LAS PLANTILLAS EXTERNAS ---
// Asegúrate de tener el archivo emailTemplates.js en la misma carpeta
const { generarHtmlBoleta, generarHtmlBienvenida, generarHtmlAnulacion } = require('./emailTemplates');

const app = express();
app.set('trust proxy', 1);
const db = new Database('sierras_db.db');
const PORT = process.env.PORT || 3000;

console.log("🚀 Iniciando Servidor POS Sierras (vFinal - Full Modificado)...");

// --- CONFIGURACIÓN DE CARPETAS Y FOTOS ---
if (!fs.existsSync('./public/uploads')){ fs.mkdirSync('./public/uploads', { recursive: true }); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|ico|svg/;
    if (allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())) return cb(null, true);
    cb(new Error('Solo imágenes'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// app.use((req, res, next) => {
//     console.log(`🔔 Petición recibida: ${req.method} ${req.url}`);
//     next();
// });

app.use(express.json({limit: '50mb'}));
app.use(cors());
app.use(express.static('public')); // Sirve el index.html

// --- BASE DE DATOS Y TABLAS ---
const schemas = [
    `CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'vendedor', nombre TEXT, email TEXT)`,
    `CREATE TABLE IF NOT EXISTS sesiones (token TEXT PRIMARY KEY, user_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS familias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, email TEXT, telefono TEXT, deuda INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, foto TEXT, categoria TEXT, precio INTEGER, costo INTEGER, stock INTEGER DEFAULT 0, activo INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS ventas (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha DATETIME DEFAULT CURRENT_TIMESTAMP, vendedor TEXT, familia_nombre TEXT, familia_email TEXT, familia_id INTEGER, saldo_historico INTEGER, total INTEGER, metodo_pago TEXT, detalle_json TEXT, status TEXT DEFAULT 'ok')`,
    `CREATE TABLE IF NOT EXISTS configuracion (key TEXT PRIMARY KEY, value TEXT)`
];

schemas.forEach(s => db.exec(s));

// Migraciones de seguridad
try { db.prepare("SELECT active FROM productos LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE productos ADD COLUMN activo INTEGER DEFAULT 1");}catch(err){} }
try { db.prepare("SELECT telefono FROM familias LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE familias ADD COLUMN telefono TEXT");}catch(err){} }
try { db.prepare("SELECT email FROM usuarios LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE usuarios ADD COLUMN email TEXT");}catch(err){} }
try { db.prepare("SELECT familia_id FROM ventas LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE ventas ADD COLUMN familia_id INTEGER");}catch(err){} }
try { db.prepare("SELECT saldo_historico FROM ventas LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE ventas ADD COLUMN saldo_historico INTEGER DEFAULT 0");}catch(err){} }
try { db.prepare("SELECT status FROM ventas LIMIT 1").get(); } catch (e) { try{db.exec("ALTER TABLE ventas ADD COLUMN status TEXT DEFAULT 'ok'");}catch(err){} }

// Configuración por defecto
const defaultConfig = { 'menu_order': JSON.stringify(['pos', 'ventas', 'familias', 'productos', 'usuarios', 'stats', 'config']), 'app_logo': '', 'app_favicon': '' };
Object.keys(defaultConfig).forEach(k => { try { db.prepare('INSERT OR IGNORE INTO configuracion (key, value) VALUES (?, ?)').run(k, defaultConfig[k]); } catch(e){} });

// 1. Leemos las credenciales del entorno
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// 2. Preguntamos a la base de datos si ESTE usuario específico existe
const userCheck = db.prepare("SELECT * FROM usuarios WHERE username = ?").get(ADMIN_USER);

// 3. Si no existe, lo creamos
if (!userCheck) {
    console.log(`⚙️ Inicialización: Creando usuario administrador por defecto (${ADMIN_USER})...`);
    
    const hash = bcrypt.hashSync(ADMIN_PASS, 10);
    
    db.prepare("INSERT INTO usuarios (username, password, role, nombre, email) VALUES (?, ?, ?, ?, ?)")
      .run(ADMIN_USER, hash, 'admin', 'Administrador', ADMIN_EMAIL);
      
    console.log("✅ Usuario administrador creado con éxito.");
}

// EMAIL CONFIG
const SMTP_FROM = 'no-reply@ganimedes.cl';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function enviarEmail(to, subject, html) {
    if(!to) { console.log("⚠️ No se envió email: Destinatario vacío"); return; }
    try {
        await transporter.sendMail({ from: { name: 'Sierras POS', address: SMTP_FROM }, sender: SMTP_FROM, replyTo: SMTP_FROM, to: to, subject: subject, html: html });
        console.log(`📧 Email enviado a ${to}: ${subject}`);
    } catch (e) { console.error(`❌ Error enviando email a ${to}:`, e.message); }
}

// MIDDLEWARES
function requireAuth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No autorizado" });
    const sesion = db.prepare("SELECT user_id FROM sesiones WHERE token = ?").get(token);
    if (!sesion) return res.status(401).json({ error: "Sesión inválida" });
    req.userId = sesion.user_id;
    next();
}

function requireAdmin(req, res, next) {
    const user = db.prepare('SELECT role FROM usuarios WHERE id = ?').get(req.userId);
    if (user && user.role === 'admin') next(); else res.status(403).json({ error: "Requiere Admin" });
}

// ================= RUTAS API =================

// --- FAMILIAS ---
app.get('/api/familias', requireAuth, (req, res) => res.json(db.prepare('SELECT * FROM familias').all()));
app.post('/api/familias', requireAuth, (req, res) => {
    const {nombre, email, telefono} = req.body;
    const vendedor = db.prepare('SELECT nombre FROM usuarios WHERE id=?').get(req.userId);
    try {
        db.prepare('INSERT INTO familias (nombre, email, telefono, deuda) VALUES (?, ?, ?, 0)').run(nombre, email, telefono);
        if(email) {
            const html = generarHtmlBienvenida(nombre, vendedor ? vendedor.nombre : 'Staff', 0);
            enviarEmail(email, 'Bienvenido a Sierras POS', html);
        }
        res.json({success:true});
    } catch(e) { res.status(500).json({error: "Error creando familia"}); }
});
app.put('/api/familias/:id', requireAuth, (req, res) => {
    const {nombre, email, telefono, deuda} = req.body;
    if(deuda === undefined){
        db.prepare('UPDATE familias SET nombre=?, email=?, telefono=? WHERE id=?').run(nombre, email, telefono, req.params.id);
    } else {
        db.prepare('UPDATE familias SET nombre=?, email=?, telefono=?, deuda=? WHERE id=?').run(nombre, email, telefono, deuda, req.params.id);
    }
    res.json({success:true});
});
app.delete('/api/familias/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM familias WHERE id=?').run(req.params.id); res.json({success:true}); });


// --- VENTAS ---
app.get('/api/ventas', requireAuth, (req, res) => res.json(db.prepare('SELECT * FROM ventas ORDER BY id DESC LIMIT 500').all()));
app.post('/api/ventas', requireAuth, async (req, res) => {
    const { vendedor, familia, total, metodo, carrito } = req.body;
    
    // Usamos una variable para guardar el resultado de la transacción
    let resultadoVenta = {};

    const transaccion = db.transaction(() => {
        const fam = db.prepare('SELECT deuda FROM familias WHERE id = ?').get(familia.id);
        const deudaActual = fam ? fam.deuda : 0;
        let nuevoSaldo = deudaActual;

        if (metodo === 'Cuenta') {
            nuevoSaldo = deudaActual + total;
            db.prepare('UPDATE familias SET deuda = ? WHERE id = ?').run(nuevoSaldo, familia.id);
        }
        
        // MODIFICACION: Usamos .run() y guardamos el resultado en 'info'
        const info = db.prepare("INSERT INTO ventas (vendedor, familia_nombre, familia_email, familia_id, saldo_historico, total, metodo_pago, detalle_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ok')")
          .run(vendedor, familia.nombre, familia.email, familia.id, nuevoSaldo, total, metodo, JSON.stringify(carrito));
        
        const updateStock = db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?');
        carrito.forEach(i => updateStock.run(i.cantidad, i.id));

        // Retornamos los datos necesarios para el correo fuera de la transacción
        return { id: info.lastInsertRowid, nuevoSaldo: nuevoSaldo };
    });

    try {
        // Ejecutamos la transacción y recibimos los datos
        resultadoVenta = transaccion();
        res.json({ success: true });

        // ENVÍO DE BOLETA CON ID
        if(familia.email) {
            const html = generarHtmlBoleta({ 
                id: resultadoVenta.id, // <--- AQUI PASAMOS EL ID NUEVO
                fecha: new Date(), 
                vendedor, 
                total, 
                metodo, 
                nuevoSaldo: resultadoVenta.nuevoSaldo 
            }, carrito);
            
            enviarEmail(familia.email, `Boleta N°${resultadoVenta.id} - Sierras`, html);
        }
    } catch(e) { 
        if(!res.headersSent) res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/ventas/:id/resend', requireAuth, (req, res) => {
    const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
    if(!v || !v.familia_email) return res.status(400).json({error: "Venta no válida"});
    
    const html = generarHtmlBoleta({ 
        id: v.id, // <--- Pasamos el ID existente
        fecha: v.fecha, 
        vendedor: v.vendedor, 
        total: v.total, 
        metodo: v.metodo_pago, 
        nuevoSaldo: v.saldo_historico 
    }, JSON.parse(v.detalle_json));

    enviarEmail(v.familia_email, `Copia Boleta N°${v.id} - Sierras`, html)
        .then(() => res.json({success:true}))
        .catch(e => res.status(500).json({error:e.message}));
});

// Busca: app.post('/api/ventas/:id/refund' ...
// Reemplaza todo ese bloque por este:

app.post('/api/ventas/:id/refund', requireAuth, requireAdmin, (req, res) => {
    const v = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
    if(!v || v.status === 'reembolsado') return res.status(400).json({error: "Error"});
    
    const t = db.transaction(() => {
        db.prepare("UPDATE ventas SET status = 'reembolsado' WHERE id = ?").run(v.id);
        try { JSON.parse(v.detalle_json).forEach(i => db.prepare('UPDATE productos SET stock = stock + ? WHERE id = ?').run(i.cantidad, i.id)); } catch(e){}
        if(v.metodo_pago === 'Cuenta' && v.familia_id) {
            db.prepare('UPDATE familias SET deuda = deuda - ? WHERE id = ?').run(v.total, v.familia_id);
        }
    });

    try { 
        t();
        res.json({ success: true }); // 1. Respuesta al cliente

        // 2. Envío de correo (Si falla, no botará el servidor gracias al cambio de abajo)
        if(v.familia_email) {
            let detalle = [];
            try { detalle = JSON.parse(v.detalle_json); } catch(e){}
            // Asegúrate de tener generarHtmlAnulacion importado arriba
            const html = generarHtmlAnulacion(v, detalle);
            enviarEmail(v.familia_email, `Anulación Boleta N°${v.id}`, html);
        }

    } catch(e) { 
        // 3. FIX: Solo respondemos con error si NO hemos respondido antes
        console.error("Error refund:", e.message);
        if (!res.headersSent) res.status(500).json({ error: e.message }); 
    }
});

// --- PRODUCTOS (CORREGIDOS CON VALORES POR DEFECTO) ---
app.get('/api/productos', requireAuth, (req, res) => res.json(db.prepare('SELECT * FROM productos').all()));

app.post('/api/productos', requireAuth, upload.single('foto'), (req, res) => { 
    console.log("📦 POST /api/productos - Creando:", req.body.nombre); 
    const url = req.file ? ('/uploads/'+req.file.filename).replace(/\\/g,"/") : ''; 
    
    // Default values para evitar crash
    const nombre = req.body.nombre || 'Sin Nombre';
    const categoria = req.body.categoria || '';
    const precio = req.body.precio || 0;
    const costo = req.body.costo || 0; 
    const stock = req.body.stock || 0;

    try{ 
        db.prepare('INSERT INTO productos (nombre, foto, categoria, precio, costo, stock, activo) VALUES (?, ?, ?, ?, ?, ?, 1)')
          .run(nombre, url, categoria, precio, costo, stock); 
        console.log("✅ Producto creado");
        res.json({success:true}); 
    } catch(e){
        console.error("❌ Error creando producto:", e.message);
        if (!res.headersSent) res.status(500).json({ error: e.message });
    } 
});

app.put('/api/productos/:id', requireAuth, upload.single('foto'), (req, res) => { 
    const nombre = req.body.nombre || 'Sin Nombre';
    const categoria = req.body.categoria || '';
    const precio = req.body.precio || 0;
    const stock = req.body.stock || 0;
    const activo = req.body.activo;

    if(req.file){ 
        const url = ('/uploads/'+req.file.filename).replace(/\\/g,"/"); 
        db.prepare('UPDATE productos SET nombre=?, categoria=?, precio=?, stock=?, activo=?, foto=? WHERE id=?').run(nombre,categoria,precio,stock,activo,url,req.params.id); 
    } else { 
        db.prepare('UPDATE productos SET nombre=?, categoria=?, precio=?, stock=?, activo=? WHERE id=?').run(nombre,categoria,precio,stock,activo,req.params.id); 
    } 
    res.json({success:true}); 
});

app.delete('/api/productos/:id', requireAuth, (req, res) => { db.prepare('DELETE FROM productos WHERE id=?').run(req.params.id); res.json({success:true}); });


// --- ESTADÍSTICAS Y EXCEL ---
app.get('/api/stats', requireAuth, (req, res) => {
    const start = req.query.start || '2000-01-01';
    const end = (req.query.end || '2099-12-31') + ' 23:59:59';

    // 1. KPIs Generales
    const totalVentas = db.prepare("SELECT COUNT(*) as c FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ?").get(start, end).c;
    const ingresos = db.prepare("SELECT SUM(total) as s FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ?").get(start, end).s || 0;
    const deuda = db.prepare('SELECT SUM(deuda) as s FROM familias').get().s || 0; 
    
    // 2. Procesamiento de Detalles (Productos y Categorías)
    const itemsVendidosQuery = db.prepare("SELECT detalle_json FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ?").all(start, end);
    let itemsVendidos = 0;
    let productStats = {};
    let categoryStats = {};

    itemsVendidosQuery.forEach(v => {
        try {
            const items = JSON.parse(v.detalle_json);
            items.forEach(i => {
                itemsVendidos += i.cantidad;
                // Producto
                if (!productStats[i.nombre]) productStats[i.nombre] = { cantidad: 0, total: 0 };
                productStats[i.nombre].cantidad += i.cantidad;
                productStats[i.nombre].total += (i.precio * i.cantidad);
                // Categoría
                let cat = i.categoria || 'General'; 
                if(cat.includes(',')) cat = cat.split(',')[0]; // Tomar la primera si hay varias
                if (!categoryStats[cat]) categoryStats[cat] = 0;
                categoryStats[cat] += (i.precio * i.cantidad);
            });
        } catch(e) {}
    });

    // 3. Consultas SQL Agrupadas
    
    // A. Por Día (Incluye conteo 'tx' para récord de transacciones)
    const salesByDate = db.prepare(`SELECT strftime('%Y-%m-%d', fecha) as dia, SUM(total) as total, COUNT(*) as tx FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? GROUP BY dia ORDER BY dia`).all(start, end);
    
    // B. Por Hora (Para gráfico de horas punta)
    const salesByHour = db.prepare(`SELECT strftime('%H', fecha) as hora, COUNT(*) as count, SUM(total) as total FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? GROUP BY hora ORDER BY hora`).all(start, end);

    // C. Por Vendedor
    const salesBySeller = db.prepare(`SELECT vendedor, SUM(total) as total FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? GROUP BY vendedor`).all(start, end);

    // D. Por Método de Pago
    const salesByMethod = db.prepare(`SELECT metodo_pago, COUNT(*) as count, SUM(total) as total FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? GROUP BY metodo_pago`).all(start, end);

    // E. Por Familia (Top que compra más)
    const salesByFamily = db.prepare(`SELECT familia_nombre as nombre, SUM(total) as total FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? GROUP BY familia_nombre ORDER BY total DESC LIMIT 10`).all(start, end);

    // 4. Ordenamiento de Arrays JS
    const topProducts = Object.entries(productStats)
        .map(([nombre, data]) => ({ nombre, cantidad: data.cantidad, total: data.total }))
        .sort((a, b) => b.cantidad - a.cantidad) // Orden por cantidad por defecto
        .slice(0, 20);

    const topCategories = Object.entries(categoryStats)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total);

    // 5. Respuesta Final
    res.json({ 
        totalVentas, 
        ingresosTotales: ingresos, 
        deudaTotal: deuda, 
        itemsVendidos, 
        charts: { 
            salesByDate, 
            salesByHour, 
            salesBySeller, 
            salesByMethod,
            salesByFamily, // <--- Importante: Incluimos familias
            topProducts,
            topCategories
        } 
    });
});

app.get('/api/export-csv', requireAuth, (req, res) => {
    const start = req.query.start || '2000-01-01';
    const end = (req.query.end || '2099-12-31') + ' 23:59:59';
    const ventas = db.prepare("SELECT * FROM ventas WHERE status != 'reembolsado' AND fecha BETWEEN ? AND ? ORDER BY fecha DESC").all(start, end);
    let csv = "\uFEFFID,Fecha,Vendedor,Familia,Metodo,Total,Detalle\n";
    ventas.forEach(v => {
        let detalleStr = "";
        try { detalleStr = JSON.parse(v.detalle_json).map(i => `${i.cantidad}x ${i.nombre}`).join(' | ').replace(/,/g, '.'); } catch(e) { detalleStr = "Error"; }
        const fechaStr = new Date(v.fecha).toLocaleString('es-CL');
        csv += `${v.id},"${fechaStr}","${v.vendedor}","${v.familia_nombre}","${v.metodo_pago}",${v.total},"${detalleStr}"\n`;
    });
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment(`ventas.csv`);
    res.send(csv);
});

// --- USUARIOS Y LOGIN ---
app.get('/api/usuarios', requireAuth, (req, res) => res.json(db.prepare('SELECT id, username, role, nombre, email FROM usuarios').all()));
app.post('/api/usuarios', requireAuth, requireAdmin, (req, res) => { const {username,password,role,nombre,email}=req.body; try{ db.prepare('INSERT INTO usuarios (username, password, role, nombre, email) VALUES (?, ?, ?, ?, ?)').run(username, bcrypt.hashSync(password, 10), role, nombre, email); if(email) enviarEmail(email, 'Credenciales', `User:${username} Pass:${password}`); res.json({success:true}); }catch(e){res.status(400).json({error:"Existe"});} });
app.put('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => { const {username,password,role,nombre,email}=req.body; if(password && password.trim()) db.prepare('UPDATE usuarios SET username=?, password=?, role=?, nombre=?, email=? WHERE id=?').run(username, bcrypt.hashSync(password, 10), role, nombre, email, req.params.id); else db.prepare('UPDATE usuarios SET username=?, role=?, nombre=?, email=? WHERE id=?').run(username, role, nombre, email, req.params.id); res.json({success:true}); });
app.delete('/api/usuarios/:id', requireAuth, requireAdmin, (req, res) => { db.prepare('DELETE FROM usuarios WHERE id=?').run(req.params.id); res.json({success:true}); });
app.post('/api/login', (req, res) => { const { username, password } = req.body; const u = db.prepare("SELECT * FROM usuarios WHERE username = ?").get(username); if(!u || !bcrypt.compareSync(password, u.password)) return res.status(400).json({error:"Error credenciales"}); const t = uuidv4(); db.prepare("INSERT INTO sesiones (token, user_id) VALUES (?, ?)").run(t, u.id); res.json({token:t, role:u.role, nombre:u.nombre}); });
app.post('/api/logout', (req, res) => { db.prepare("DELETE FROM sesiones WHERE token = ?").run(req.headers.authorization); res.json({success:true}); });

// --- CONFIG GENERAL ---
app.get('/api/config', requireAuth, (req, res) => { const rows = db.prepare('SELECT * FROM configuracion').all(); const c = {}; rows.forEach(r => c[r.key] = r.value); res.json(c); });
app.post('/api/config', requireAuth, requireAdmin, (req, res) => { const { key, value } = req.body; db.prepare('INSERT OR REPLACE INTO configuracion (key, value) VALUES (?, ?)').run(key, value); res.json({ success: true }); });
app.post('/api/config/upload', requireAuth, requireAdmin, upload.single('file'), (req, res) => { if(!req.file) return res.status(400).json({error: "No file"}); const url=('/uploads/'+req.file.filename).replace(/\\/g,"/"); db.prepare('INSERT OR REPLACE INTO configuracion (key, value) VALUES (?, ?)').run(req.body.key, url); res.json({success:true, url}); });
app.post('/api/reset-database', requireAuth, requireAdmin, (req, res) => { try { const t=db.transaction(()=>{ db.prepare("DELETE FROM ventas").run(); db.prepare("DELETE FROM familias").run(); db.prepare("DELETE FROM productos").run(); db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('ventas','familias','productos')").run(); }); t(); res.json({success:true}); } catch(e){ res.status(500).json({error:e.message}); } });

app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));