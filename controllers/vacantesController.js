const mongoose = require('mongoose')
const Vacante = mongoose.model('Vacante')
const multer = require('multer');
const shortid = require('shortid');

exports.formularioNuevaVacante = (req, res) => {
    res.render('nueva-vacante', {
        nombrePagina: 'Nueva Vacante',
        tagline: 'Llena el formulario y publica tu vacante',
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen
    })
}

// agregar las vacantes a la bd
exports.agregarVacante = async (req, res) => {    
    
    const vacante = new Vacante(req.body)

    // usuario autor de la vacante
    vacante.autor = req.user._id

    // crear arreglo de habilidades (skills)
    vacante.skills = req.body.skills.split(',')

    // almacenarlo en la base de datos
    const nuevaVacante = await vacante.save()
    
    // redireccionar
    res.redirect(`/vacantes/${nuevaVacante.url}`)
}

// muestra una vacante
exports.mostrarVacante = async (req, res, next) => {
    const vacante = await Vacante.findOne({url: req.params.url}).populate('autor').lean()
    
    // si no hay resultados
    if(!vacante) return next();

    res.render('vacante', {
        vacante,
        nombrePagina : vacante.titulo,
        barra: true
    })
}

exports.formEditarVacante = async (req, res, next) => {
    const vacante = await Vacante.findOne({url: req.params.url}).lean()

    if (!vacante) next()

    res.render('editar-vacante', {
        vacante,
        nombrePagina: `Editar - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen
    })
}

exports.editarVacante = async (req, res) => {
    const vacanteActualizada = req.body
    vacanteActualizada.skills = req.body.skills.split(',')
    const vacante = await Vacante.findOneAndUpdate({url: req.params.url}, 
        vacanteActualizada, { 
            new: true,
            runValidators: true 
        }).lean()
    
    res.redirect(`/vacantes/${vacante.url}`)
}

// Validar y Sanitizar los campos de las nuevas vacantes
exports.validarVacante = (req, res, next) => {
    // sanitizar los campos
    req.sanitizeBody('titulo').escape()
    req.sanitizeBody('empresa').escape()
    req.sanitizeBody('ubicacion').escape()
    req.sanitizeBody('salario').escape()
    req.sanitizeBody('contrato').escape()
    req.sanitizeBody('skills').escape()

    // validar
    req.checkBody('titulo', 'Agrega un titulo a la Vacante').notEmpty()
    req.checkBody('empresa', 'Agrega una Empresa').notEmpty()
    req.checkBody('ubicacion', 'Agrega una Ubicacion').notEmpty()
    req.checkBody('contrato', 'Selecciona el tipo de Contrato').notEmpty()
    req.checkBody('skills', 'Agrega al menos una habilidad').notEmpty()

    const errores = req.validationErrors()

    if (errores) {
        // recargar la vista con los errores
        req.flash('error', errores.map(error => error.msg))
        res.render('nueva-vacante', {
            nombrePagina: 'Nueva Vacante',
            tagline: 'Llena el formulario y publica tu vacante',
            cerrarSesion: true,
            nombre: req.user.nombre,
            mensajes: req.flash()
        })
        return
    }

    next() // siguiente middleware
}

exports.eliminarVacante = async (req, res) => {
    const { id } = req.params
    
    const vacante = await Vacante.findById(id)
    
    if(verificarAutor(vacante, req.user)) {
        // eliminar user
        vacante.deleteOne()
        res.status(200).send('Vacante Eliminada Correctamente')
    } else {
        // no permitido
        res.status(403).send('Error')
    }

    
}

const verificarAutor = (vacante = {}, usuario = {}) => {
    if(!vacante.autor.equals(usuario._id)) {
        return false
    }

    return true
}

// Subir archivos en PDF
exports.subirCV  =  (req, res, next) => {
    upload(req, res, function(error) {
        if(error) {
            if(error instanceof multer.MulterError) {
                if(error.code === 'LIMIT_FILE_SIZE') {
                    req.flash('error', 'El archivo es muy grande: Máximo 100kb');
                } else {
                    req.flash('error', error.message);
                }
            } else {
                req.flash('error', error.message);
            }
            res.redirect('back');
            return;
        } else {
            return next();
        }
    });
}


// Opciones de Multer
const configuracionMulter = {
    limits : { fileSize : 100000 },
    storage: fileStorage = multer.diskStorage({
        destination : (req, file, cb) => {
            cb(null, __dirname+'../../public/uploads/cv');
        },
        filename : (req, file, cb) => {
            const extension = file.mimetype.split('/')[1];
            cb(null, `${shortid.generate()}.${extension}`);
        }
    }),
    fileFilter(req, file, cb) {
        if(file.mimetype === 'application/pdf' ) {
            // el callback se ejecuta como true o false : true cuando la imagen se acepta
            cb(null, true);
        } else {
            cb(new Error('Formato No Válido'));
        }
    }
}

const upload = multer(configuracionMulter).single('cv');

// Almacenar los candidatos en la BD
exports.contactar = async (req, res, next) => {
    const vacante = await Vacante.findOne({url: req.params.url})
    if (!vacante) return next()

    const nuevoCandidato = {
        nombre: req.body.nombre,
        email: req.body.email,
        cv: req.file.filename
    }

    // almacenar la vacante
    vacante.candidatos.push(nuevoCandidato)
    await vacante.save()

    // mensaje flash y redireccion
    req.flash('correcto', 'Se envio tu Curriculum correctamente')
    res.redirect('/')
}

exports.mostrarCandidatos = async (req, res, next) => {
    const vacante = await Vacante.findById(req.params.id).lean()

    if(!vacante) return next()

    if (vacante.autor != req.user._id.toString()) {
        return next()
    }

    res.render('candidatos', {
        nombrePagina: `Candidatos Vacante - ${vacante.titulo}`,
        cerrarSesion: true,
        nombre: req.user.nombre,
        imagen: req.user.imagen,
        candidatos: vacante.candidatos
    })
}

exports.buscarVacantes = async (req, res) => {
    const vacantes = await Vacante.find({
        $text: {
            $search: req.body.q
        }
    }).lean()

    res.render('home', {
        nombrePagina:  `Resultados para la busqueda: ${req.body.q}`,
        barra: true,
        vacantes
    })
}