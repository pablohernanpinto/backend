const {Router} = require('express');
const router = Router();
const DB = require('../config/config');


router.get('/', (req,res) => {
    res.status(200).json({
        message: "ruta estatus 200"
    });
});


router.get('/getConvenios',async (req,res)=> {
    const convenios = [];
    sql="select * from CONVENIO";

    let result = await DB.Open(sql,[],false); // Ejecuta la consulta en la base de datos y almacena el resultado en 'result'
    
    //console.log(result.rows);    
    console.log(convenios);

    // Se mapean los resultados de la consulta a un formato deseado antes de enviarlos como respuesta
    result.rows.map(convenio=> {
        let userSchema ={
            "ID": convenio[0],
            "NOMBRE_CONV": convenio[1],
            "TIPO_CONV": convenio[2],
            "VIGENCIA": convenio[3],
            "ANO_FIRMA": convenio[4],
            "TIPO_FIRMA": convenio[5],
            "CUPOS": convenio[6],
            "DOCUMENTOS": convenio[7]
        }
        convenios.push(userSchema);
    }); 
    res.json({convenios}); // Devuelve una respuesta JSON que contiene el arreglo 'convenios' como resultado de la solicitud
    
});


/**La siguiente solicitud deberia venir en el formato:
 * {
 *   "datosInstitucion":{
 *      "nombreInstitucion" : "Nombre de la Institucion",
 *      "unidadAcademica" : "Nombre de la Unidad Academica",
 *      "pais" : "Pais",
 *      "alcance" : "Tipo de alcance",
 *      "tipoInstitucion" : "Tipo de institucion"
 *   },
 *   "datosConvenio":{
 *      "nombreConvenio" : "Nombre del convenio",
 *      "tipoConvenio" : "Tipo de convenio",
 *      "vigencia" : "Vigencia",
 *      "anoFirma" : "Año de firma",
 *      "tipoFirma" : "Tipo de firma",
 *      "cupos" : "Cupos",
 *      "documentos" : "Documentos"
 *   }
 * }
 */
router.post('/addConvenio', async (req, res) => {    
    const { nombreInstitucion, unidadAcademica, pais, alcance, tipoInstitucion } = req.body.datosInstitucion;

    // Verifica si la institución ya existe en la base de datos
    const checkInstitucionQuery = "SELECT ID_INSTITUCION FROM INSTITUCION WHERE NOMBRE_INST = :nombreInstitucion";
    const institucionResult = await DB.Open(checkInstitucionQuery, { nombreInstitucion }, false);

    let idInstitucion;

    if (institucionResult.rows.length > 0) {
        // La institución ya existe, obtén su ID
        idInstitucion = institucionResult.rows[0][0];
    } else {
        // La institución no existe, así que primero la insertamos
        const insertInstitucionQuery = "INSERT INTO INSTITUCION (ID_INSTITUCION, NOMBRE_INST) VALUES (SEQ_PK_INSTITUCION.NEXTVAL, :nombreInstitucion) RETURNING ID_INSTITUCION INTO :outId";
        const insertInstitucionParams = {
            nombreInstitucion,
            unidadAcademica,
            pais,
            alcance,
            tipoInstitucion,
            outId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        };
        const insertInstitucionResult = await DB.Open(insertInstitucionQuery, insertInstitucionParams, true);

        // Obtén el ID de la institución recién insertada
        idInstitucion = insertInstitucionResult.outBinds.outId;
    }

    // Ahora puedes insertar el convenio asociado a la institución
    const { nombreConvenio, tipoConvenio, vigencia, anoFirma, tipoFirma, cupos, documentos } = req.body.datosConvenio;
    const insertConvenioQuery = "INSERT INTO CONVENIO (ID_CONVENIO, NOMBRE_CONV, ID_INSTITUCION, /* otros campos */) VALUES (SEQ_PK_CONVENIO.NEXTVAL, :nombreConvenio, :idInstitucion, /* otros valores */)";
    const insertConvenioParams = {
        nombreConvenio,
        tipoConvenio, 
        vigencia,
        anoFirma,
        tipoFirma,
        cupos,
        documentos
    };

    // Ejecuta la inserción del convenio
    const insertConvenioResult = await DB.Open(insertConvenioQuery, insertConvenioParams, true);

    // Inserta el enlace en la tabla DETALLE_CONVENIO_INSTITUCION
    const insertDetalleConvenioQuery = "INSERT INTO DETALLE_CONVENIO_INSTITUCION (ID_DETALLE, ID_CONVENIO, ID_INSTITUCION) VALUES (SEQ_PK_DETALLE.NEXTVAL, :idConvenio, :idInstitucion)";
    const insertDetalleConvenioParams = {
        idConvenio: insertConvenioResult.outBinds.idConvenio,
        idInstitucion
    };

    // Ejecuta la inserción del enlace
    await DB.Open(insertDetalleConvenioQuery, insertDetalleConvenioParams, false);

    res.json({ message: 'Convenio insertado correctamente' });
});



module.exports = router;