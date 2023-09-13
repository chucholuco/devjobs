const mongoose = require('mongoose');
const multer = require('multer');
const shortid = require('shortid')
const Usuarios = mongoose.model('Usuarios');

exports.subirImagen = (req, res, next) => {
    upload(req, res, function(error) {
        if (error instanceof multer.MulterError) {
            return next()
        }
    }) 
    next()
}

//opciones de multer
const configuracionMulter = {
    storage: fileStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, __dirname + '../../public/uploads/perfiles')
        },
        filename: (req, file, cb) => {
            const extension = file.mimetype.split('/')[1]
            cb(null, `${shortid.generate()}.${extension}`) 
        }
    }),
    fileFilter(req, file, cb) {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
            // el callback se ejecuta como true o false: true cuando la imagen se acepta
            cb(null, true)
        } else {
            cb(null, false)
        }
    },
    limits: {fileSize: 2000000} //2 MB
}

const upload = multer(configuracionMulter).single('imagen')

exports.formCrearCuenta = (req, res) => {
    res.render('crear-cuenta', {
        nombrePagina: 'Crea tu cuenta en devJobs',
        tagline: 'Comienza a publicar tus vacantes gratis, solo debes crear una cuenta'
    })
}

exports.validarRegistro = (req, res, next) => {
    // sanitizar
    req.sanitizeBody('nombre').escape();
    req.sanitizeBody('email').escape();
    req.sanitizeBody('password').escape();
    req.sanitizeBody('confirmar').escape();

    // validar
    req.checkBody('nombre', 'El Nombre es Obligatorio').notEmpty();
    req.checkBody('email', 'El email debe ser valido').isEmail();
    req.checkBody('password', 'El password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'Confirmar password no puede ir vacio').notEmpty();
    req.checkBody('confirmar', 'El password es diferente').equals(req.body.password);

    const errores = req.validationErrors();

    if(errores){
        // si hay errores
        req.flash('error', errores.map(error => error.msg));

        res.render('crear-cuenta', {
            nombrePagina: 'Crea tu cuenta en devJobs',
            tagline: 'Comienza a publicar tus vacantes gratis, solo debes crear una cuenta',
            mensajes: req.flash()
        });
        return;
    }

    // Si toda la validación es correcta
    next();
}

exports.crearUsuario = async (req, res, next) => {

    // Crear el usuario
    const usuario = new Usuarios(req.body)

    try {
        await usuario.save()     
        res.redirect('/iniciar-sesion')   
    } catch (error) {
        req.flash('error', error)   
        res.redirect('/crear-cuenta')
    }
}

exports.formIniciarSesion = (req, res) => {
    res.render('iniciar-sesion', {
        nombrePagina: 'Iniciar Sesion devJobs'
    })
}

// Form editar el perfil
exports.formEditarPerfil = (req, res) => {
    res.render('editar-perfil', {
        nombrePagina: 'Edita tu perfil en devJobs',
        cerrarSesion: true,
        nombre: req.user.nombre,
        usuario: req.user
    })
}

// Guardar cambios editar perfil
exports.editarPerfil = async (req, res) => {
    const usuario = await Usuarios.findById(req.user._id)
    
    usuario.nombre = req.body.nombre
    usuario.email = req.body.email
    if(req.body.password) {
        usuario.password = req.body.password
    }

    if (req.file) {
        usuario.imagen = req.file.filename
    }

    await usuario.save()

    req.flash('correcto', 'Cambios Guardados Correctamente')

    // redirect
    res.redirect('/administracion')
}

exports.validarPerfil = (req, res, next) => {
    // sanitizar
    req.sanitizeBody('nombre').escape()
    req.sanitizeBody('email').escape()
    if (req.body.password) {
        req.sanitizeBody('password').escape()
    }

    // validar
    req.checkBody('nombre', 'El nombre no puede ir vacio').notEmpty()
    req.checkBody('email', 'El correo no puede ir vacio').notEmpty()

    const errores = req.validationErrors() 

    if (errores) {
        req.flash('error', errores.map(error => error.msg ))

        res.render('editar-perfil', {
            nombrePagina: 'Edita tu perfil en devJobs',
            cerrarSesion: true,
            nombre: req.user.nombre,
            usuario: req.user, 
            mensajes: req.flash()
        })
        
        return
    }

    next()
}