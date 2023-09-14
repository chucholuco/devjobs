const emailConfig = require('../config/email');
const nodemailer = require('nodemailer');
const hbs = require('nodemailer-express-handlebars');
const util = require('util');
const path = require('path');
const { reset } = require('nodemon');

let transport = nodemailer.createTransport({
    host : emailConfig.host,
    port : emailConfig.port,
    auth: {
        user : emailConfig.user,
        pass: emailConfig.pass
    }
})

// Utilizar templates de Handlebars
transport.use('compile', hbs({
    viewEngine: {
        extname: 'handlebars',
        layoutsDir: path.resolve(__dirname, '../views/emails'),
        defaultLayout: false
    },
    viewPath: path.resolve(__dirname, '../views/emails'),
    extName: '.handlebars',
    
}));
const sendMail = util.promisify(transport.sendMail).bind(transport);

exports.enviar = async (opciones) => {     
    const opcionesEmail = {
        from:'devJobs <noreply@devjobs.com>',
        to: opciones.usuario.email,
        subject : opciones.subject, 
        template: opciones.archivo,        
        context: {
            resetUrl : opciones.resetUrl
        }
    }

    try {
        return await sendMail(opcionesEmail)
    } catch(error) {
        console.error("Failed to send mail: ", error);
        throw error;
    }
        

    //return sendMail.call(transport, opcionesEmail);
}