const mongoose = require('mongoose')
const Vacante = mongoose.model('Vacante')

exports.mostrarTrabajos = async (req, res) => {

    const vacantes = await Vacante.find().lean()

    if (!vacantes) return next()

    res.render('home', {
        nombrePagina: 'devJobs',
        tagline: 'Encuentra y publica trabajos para desarrolladores Web',
        barra: true,
        boton: true,
        vacantes
    })
}