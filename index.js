var fs = require('fs');
const axios = require('axios').default;
const intervaloProceso = 60000; //1 min

//Lista de sensores registrados
let sensores = [
    {
        idSensor: 'eui-60c5a8fffe78a270',
        estacion: "Av. Lázaro Cardenas (SEMADET)",
        idEstacion: 1,
        latitud: 20.625052,
        longitud: -103.305382,
        altitud: 1608
    },
    {
        idSensor: 'eui-60c5abfffe789db4',
        estacion: "Estación de Bomberos El Salto",   
        idEstacion: 2,
        latitud: 20.5133528,
        longitud: -103.237711,
        altitud: 1549
    },
    {
        idSensor: 'eui-60c5a8fffe789e39',
        estacion: "Tienda de Abarrotes Santa Maria Tequepexpan",
        idEstacion: 3,
        latitud: 20.5966889,
        longitud: -103.39381944444445,
        altitud: 1592
    },
    {
        idSensor: 'eui-60c5a8fffe789e25',
        estacion: "Martires de Rio Blanco",
        idEstacion: 4,
        latitud: 20.5138722,
        longitud: -103.17602222222223,
        altitud: 1512
    },
    {
        idSensor: 'eui-60c5a8fffe789dec',
        estacion: "DIF Juanacatlán",
        idEstacion: 5,
        latitud: 20.5105806,
        longitud: -103.16968055555556,
        altitud: 1528
    },
    {
        idSensor: 'eui-60c5a8fffe789d8a',
        estacion: "CU Tonala",
        idEstacion: 6,
        latitud: 20.5666667,
        longitud: -103.2286388888889,
        altitud: 1544
    },
    {
        idSensor: 'eui-60c5a8fffe789e1b',
        estacion: "Hacienda Real (Tonalá)",
        idEstacion: 7,
        latitud: 20.5902778,
        longitud: -103.23380555555556,
        altitud: 1545
    },
    {
        idSensor: 'eui-60c5a8fffe789e7f',
        estacion: "Instituto de la mujer (Las Pintas)",
        idEstacion: 8,
        latitud: 20.57690278,
        longitud: -103.32652778,
        altitud: 1000
    },
    {
        idSensor: 'eui-60c5a8fffe78a26c',
        estacion: "Lico Cortina (Tlaquepaque)",
        idEstacion: 9,
        latitud: 20.59263333,
        longitud: -103.26768611,
        altitud: 1545
    },
    {
        idSensor: 'eui-60c5a8fffe789b50',
        estacion: "Dirección Gestión Ambiental y Cambio Climático Tonalá",
        idEstacion: 10,
        latitud: 20.625579,
        longitud: -103.250854,
        altitud: 1662
    }
]

var elementosSinEnviar = [];

//Elementos de configuracion para envio de informacion a diferentes servidores
var configuracionEndpoints = [
    {
        nombre: "SEMADET",
        conToken: false,
        token: "",
        endpointEnvio: "http://semadet.ciateq.net.mx:8080/semadet/api/mediciones",
        opcionesObtenerLlave: {
            url: "http://semadet.ciateq.net.mx:8080/semadet/api/seguridad/autenticar",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            data: {
                usuario: "$uSuario_embed20$$",
                contrasena: "$cCOnTr0294_·M#",
            }
        },
    },
    {
        nombre: "SIMAAS",
        conToken: false,
        token: "",
        endpointEnvio: "http://simaas.jalisco.gob.mx:8081/semadet/api/mediciones",
        opcionesObtenerLlave: {
            url: "http://simaas.jalisco.gob.mx:8081/semadet/api/seguridad/autenticar",
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            data: {
                usuario: "$uSuario_embed20$$",
                contrasena: "$cCOnTr0294_·M#",
            }
        }

    },
]

//Guarda la información enviada en un archivo CSV
function guardarFila(fila){
    console.log(`[${getFechaCIATEQ(new Date())}] Guardando Fila...`);
    var encabezados = 'Estacion, Grupo, FechaHora, Temperatura, Humedad Relativa, no2, co, o3, so2, c6h6, pm10, pm25 \n';
    try{
        var nombreArchivo = "DatosEstaciones_" + getFechaArchivo(new Date()) + ".csv"
        if(fs.existsSync(nombreArchivo)){
            console.log(`[${getFechaCIATEQ(new Date())}] El archivo ${nombreArchivo} existe.. se omite encabezado`);
        }else{
            console.log(`[${getFechaCIATEQ(new Date())}] El archivo ${nombreArchivo} no existe.. se crea y añade encabezado`);
            fs.open(nombreArchivo, 'w', function(err, file){
                if(err) throw err;
            });
            fs.appendFile(nombreArchivo, encabezados, function (err) {
                if (err) throw err;
            }); 
        }
        /*fs.open(nombreArchivo, 'w', function(err, file){
            if(err) throw err;
        });*/
        fs.appendFile(nombreArchivo, fila, function (err) {
            if (err) throw err;
        }); 
    }catch(err){
        console.log(`[${getFechaCIATEQ(new Date())}] Error al guardar fila en archivo. ${err}`);
    }
}

/**
 * Obtiene los valores de la ultima hora de cada elemento, genera el promedio y lo envía
 * @param {Identificador de los datos del sensor} id 
 */
async function obtenerDatos(id){
    let headersList = {
        'Accept': 'text/event-stream',
        "Authorization": "Bearer NNSXS.YIVTXIFRYE65FY2MMGKAVVCMRFPNAZXMP7VWRIQ.UJTMOPGL7XG6OHAOOBTXD4Y563TJG5UWB6WOUABUBEHISKU5TRGA" 
    };
    console.log(`Obteniendo valores de sensor: ${id.idSensor}...`);
    await axios.get(`https://nam1.cloud.thethings.network/api/v3/as/applications/prueba3/devices/${id.idSensor}/packages/storage/`, {
        headers: headersList
    }).then(async (response)=>{
        if(response.data == ""){            
            console.log(`[${getFechaCIATEQ(new Date())}] No hay datos disponibles por el momento...`);
        }else{
            var pm10 = 0;
            var pm25 = 0;
            var o3 = 0;
            var so2 = 0;
            var no2 = 0;
            var co = 0;
            var c6h6 = 0;
            var humedadRelativa = 0;
            var temperatura = 0;
            
            var datosCrudos = response.data;
            var datosSeparados = datosCrudos.split("\n");

            var fechaIni = new Date(); //Cambiar a fecha-hora del dia
            var fechaFin = new Date(); //cambiar a fecha hora del dia y quitar documentacion de sig linea
            fechaFin = fechaFin.setHours(fechaFin.getHours() + 1);
            var fecha = new Date();
            var horaZSlice = "";

            for(var i=0; i<datosSeparados.length; i++){
                try{
                    var datos = JSON.parse(datosSeparados[i]);
                    var horaZ = "" + datos.result.uplink_message.received_at;
                    //console.log("datosZ: " + horaZ);
                    var horaZSlice = horaZ.slice(0, horaZ.length-1);
                    //console.log("horaZSlide: " + horaZSlice);
                    fecha = new Date(horaZSlice);
                    //console.log("Fecha convertida: " + fecha);
                    
                    if(fecha >= fechaIni && fecha <= fechaFin){ //Desactivar condicion para envio masivo
                        so2 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.x));
                        co = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.y));
                        no2 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.z));
                        o3 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_2.x));
                        c6h6 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_2.y));
                        pm10 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_3.y));
                        pm25 = Math.abs(parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_3.x));
                        humedadRelativa = parseFloat(datos.result.uplink_message.decoded_payload.relative_humidity_4);
                        temperatura = parseFloat(datos.result.uplink_message.decoded_payload.temperature_5);
                        break; //Desactivar break para envio masivo
                    }
                }catch(error){
                    
                }
            } //Llave del FOR: Activar cuando se envia de solo 1. Desactivar cuando hagamos envio masivo
        
            if (isNaN(temperatura)){
                temperatura = 0;
            }

            if(isNaN(humedadRelativa)){
                humedadRelativa =0;
            }

            /*console.log("so2: " + so2);
            console.log("co: " + co);
            console.log("no2: " + no2);
            console.log("o3: " + o3);
            console.log("c6h6: " + c6h6);
            console.log("humedad Relativa: " + humedadRelativa);
            console.log("temperatura: " + temperatura);*/

            if(so2 == 0 && co == 0 && no2 == 0 && o3 == 0 && c6h6 == 0 && humedadRelativa == 0 && temperatura == 0){
                console.log(`[${getFechaCIATEQ(new Date())}] Valores en 0 de la estacion ${id.estacion}. No se enviará nada`);
            }else{
                var idgroup = "" + id.idEstacion
                var JSONCiateq = {
                    "stationInformation" :
                    {
                        "description" : id.estacion,
                        "idGroup" : idgroup,
                        "sendingTimeStamp" : getFechaCIATEQ(fecha),
                        "latitude" : id.latitud,
                        "longitude" : id.longitud,
                        "altitude" : id.altitud
                    },
                    "environmentalInformation" :
                    {
                        "variables" :
                        [
                            {
                                "temperature" : 
                                {
                                    "value" : temperatura
                                }
                            },
                            {
                                "humidity" : 
                                {
                                    "value" : humedadRelativa
                                }
                            }
                        ]
                    },
                    "airPollutants" : 
                    [
                        {
                            "pm25" : 
                            {
                                "value" : pm25
                            }
                        },
                        {
                            "pm10" :
                            {
                                "value" : pm10
                            }
                        },
                        {
                            "no2" :
                            {
                                "value" : no2
                            }
                        },
                        {
                            "co" :
                            {
                                "value" : co
                            }
                        },
                        {
                            "o3" :
                            {
                                "value" : o3
                            }
                        },
                        {
                            "so2" :
                            {
                                "value" : so2
                            }
                        },
                        {
                            "c6h6" :
                            {
                                "value" : c6h6
                            }
                        }
                    ],
                    "waterIndicators" :
                    [
                        {
                            "ph" : 
                            {
                                "value" : 0
                            }
                        },
                        {
                            "pb" : 
                            {
                                "value" : 0
                            }
                        },
                        {
                            "conductivity" : 
                            {
                                "value" : 0
                            }
                        },
                        {
                            "dissolvedOxygen" : 
                            {
                                "value" : 0
                            }
                        },
                        {
                            "temperature" :
                            {
                                "value" : 0
                            }
                        },
                        {
                            "cd" :
                            {
                                "value" : 0
                            }
                        },
                        {
                            "haze" :
                            {
                                "value" : 0
                            }
                        }
                    ]
                }            

                //Añadiendo datos a CSV
                var fila = `${id.estacion}, ${id.idEstacion}, ${datos.result.uplink_message.received_at}, ${temperatura}, ${humedadRelativa}, ${no2}, ${co}, ${o3}, ${so2}, ${c6h6}, ${pm10}, ${pm25} \n`

                guardarFila(fila) //desactivar en caso de no querer guardar archivo CSV
                console.log(`[${getFechaCIATEQ(new Date())}] JSON por enviar *******`);
                console.log(JSON.stringify(JSONCiateq));
                console.log(`*******************************************************`);

                //Envio de datos a CIATEQ
                await enviarDatosCIATEQ(JSONCiateq);
                pm10 = 0;
                pm25 = 0;
                o3 = 0;
                so2 = 0;
                no2 = 0;
                co = 0;
                c6h6 = 0;
                humedadRelativa = 0;
                temperatura = 0;
            }
            //} //LlaveFor. Activar cuando sea envio masivo
        }
    }).catch((error)=>{
        console.log(`[${getFechaCIATEQ(new Date())}] Error al interactuar con la información proporcionada del sensor. ${error}`);
    })
}

//Cada corrida buscará datos rezagados en caso de que no se hayan podido enviar por alguna razon...
async function enviarDatosRezagados(){
    if(elementosSinEnviar.length > 0){
        var pausar = false
        console.log(`[${getFechaCIATEQ(new Date())}] Se encontraron ${elementosSinEnviar.length} elementos rezagados. Se intentarán enviar...`);
        while(elementosSinEnviar.length > 0 && pausar != false){
            datos = elementosSinEnviar.pop();
            //console.log("dato rezagado por enviar: " + JSON.stringify(datos));
            var contador = 1;
            for(let i=0; i<configuracionEndpoints.length; i++){
                if (configuracionEndpoints[i].token != "" || configuracionEndpoints[i].token != undefined){
                    let headersEnvioJSON = {
                        "token-sx": configuracionEndpoints[i].token,
                        "Content-Type": "application/json" 
                    };
                    let opcionesEnvioJSON = {
                        url: configuracionEndpoints[i].endpointEnvio,
                        method: "PUT",
                        headers: headersEnvioJSON,
                        data: datos
                    };
                    await axios.request(opcionesEnvioJSON).then(function (response) {
                        if(response.status == 200){
                            console.log(`[${getFechaCIATEQ(new Date())}] Elemento ${contador} de ${elementosSinEnviar.length-1} enviado satisfactoriamente`);
                            //contador++;
                        }else{
                            console.log(`[${getFechaCIATEQ(new Date())}] Hubo un error al enviar informacion rezagada al servidor ${configuracionEndpoints[i].nombre}. El JSON se guardará para enviarse despues. ${response.status}`);
                            elementosSinEnviar.push(datos);
                            pausar = true;
                        } 
                    }).catch(function (error) {
                        console.log(`[${getFechaCIATEQ(new Date())}] Error subiendo el JSON al servidor ${configuracionEndpoints[i].nombre}. Se guardará para enviarse despues. ${error}`);
                        elementosSinEnviar.push(datos);
                        pausar = true;
                    });
                }else{
                    console.log(`[${getFechaCIATEQ(new Date())}] No se encontró un token en uno o mas servidores. Se buscará nuevo Token...`);
                }
            }
        }
    }else{
        console.log(`[${getFechaCIATEQ(new Date())}] Sin datos rezagados...`);
    }
}

//Envía los datos a los endpoints guardados en el JSON de configuracionEndpoints
async function enviarDatosCIATEQ(datos){
    for(let i=0; i<configuracionEndpoints.length; i++){
        if(configuracionEndpoints[i].conToken == false){
            await axios.request(configuracionEndpoints[i].opcionesObtenerLlave).then(function (response) {
                configuracionEndpoints[i].conToken = true;
                configuracionEndpoints[i].token = response.data.msg.token;
    
                let headersEnvioJSON = {
                    "token-sx": response.data.msg.token,
                    "Content-Type": "application/json" 
                };
                
                let opcionesEnvioJSON = {
                    url: configuracionEndpoints[i].endpointEnvio,
                    method: "PUT",
                    headers: headersEnvioJSON,
                    data: datos
                };  
                
                axios.request(opcionesEnvioJSON).then(function (response) {
                    if(response.status == 200){
                        console.log(`[${getFechaCIATEQ(new Date())}] Elemento enviado satisfactoriamente al servidor ${configuracionEndpoints[i].nombre}`);
                    }else{
                        console.log(`[${getFechaCIATEQ(new Date())}] Hubo un error al enviar la información al servidor ${configuracionEndpoints[i].nombre}. El JSON se guardará para enviarse despues ${response.status}`);
                        elementosSinEnviar.push(datos);
                        configuracionEndpoints[i].conToken = false;
                    } 
                }).catch(function (error) {
                    console.log(`[${getFechaCIATEQ(new Date())}] Error subiendo el JSON al servidor ${configuracionEndpoints[i].nombre}. Se guardará para enviarse despues. ${error}`);
                    //console.log("Elemento a guardar: " + JSON.stringify(datos));
                    elementosSinEnviar.push(datos);
                    configuracionEndpoints[i].conToken = false;
                });
            }).catch(function (error) {
                console.log(`[${getFechaCIATEQ(new Date())}] Error obteniendo el token de conexion para el servidor ${configuracionEndpoints[i].nombre}. El JSON se guardará para enviarse despues. ${error}`);
                //console.log("Elemento a guardar: " + JSON.stringify(datos));
                elementosSinEnviar.push(datos);
                configuracionEndpoints[i].conToken = false;
            });
        }else{
            let headersEnvioJSON = {
                "token-sx": configuracionEndpoints[i].token,
                "Content-Type": "application/json" 
            };
            let opcionesEnvioJSON = {
                url: configuracionEndpoints[i].endpointEnvio,
                method: "PUT",
                headers: headersEnvioJSON,
                data: datos
            };
            
            await axios.request(opcionesEnvioJSON).then(function (response) {
                if(response.status == 200){
                    console.log(`[${getFechaCIATEQ(new Date())}] Elemento enviado satisfactoriamente al servidor ${configuracionEndpoints[i].nombre}`);
                }else{
                    console.log(`[${getFechaCIATEQ(new Date())}] Hubo un error al enviar la información al servidor ${configuracionEndpoints[i]}. El JSON se guardará para enviarse despues. ${response.status}`);
                    elementosSinEnviar.push(datos);
                    configuracionEndpoints[i].conToken = false;
                } 
            }).catch(function (error) {
                //console.log("Error subiendo el JSON. Se guardará para enviarse despues. " + error);
                console.log(`[${getFechaCIATEQ(new Date())}] Error subiendo el JSON al servidor ${configuracionEndpoints[i]}. Se guardará para enviarse depues. ${error}`);
                elementosSinEnviar.push(datos);
                configuracionEndpoints[i].conToken = false;
            });
        }
    }  
}

function getMes (dmes) {
    return dmes.getMonth() + 1
}
  
function getFormatoDia (dia) {
    if ( dia.getDate() < 10) {
      //console.log(`Regrese: 0${dia.getDate()}`)
      return `0${dia.getDate()}`
    } else {
      //console.log(`Regrese: ${dia.getDate()}`)
      return `${dia.getDate()}`
    }
}

function getFormatoMes (mes) {
    if (mes < 10) {
      return `0${mes}`
    } else {
      return `${mes}`
    }
  }
  
function getFormatoHora (tiempo) {
    if (tiempo < 10) {
      return `0${tiempo}`
    } else {
      return `${tiempo}`
    }
}
      
function getFechaCIATEQ (d) {
    return d.getFullYear() + "-" + getFormatoMes(getMes(d)) + "-" + getFormatoDia(d) + " " + getFormatoHora(d.getHours()) + ":" + getFormatoHora(d.getMinutes()) + ":" + getFormatoHora(d.getSeconds());
}

function getFechaArchivo(d) {
    return d.getFullYear() + getFormatoMes(getMes(d)) + getFormatoDia(d);
}

async function main () {
    setInterval(async()=> {
        console.log(`[${getFechaCIATEQ(new Date())}] Verificando elementos sin enviar...`);
        await enviarDatosRezagados();
        for(var i=0; i<sensores.length; i++){
            console.log(`[${getFechaCIATEQ(new Date())}] Revisando: ${sensores[i].idSensor}`);
            await obtenerDatos(sensores[i]);
        }
        console.log("---------------------------------------------------------------------");
    }, intervaloProceso);

    //Para uso sin temporaizador (test)
    /*for(var i=0; i<sensores.length; i++){
        console.log("Revisando: " + sensores[i].idSensor);
        await obtenerDatos(sensores[i]);
    }
    console.log("---------------------------------------------------------------------");*/
}

main();