/**
 * Servicio de obtención de información de las estaciones de monitoreo
 */

const { estaciones } = require('./estaciones');
const { configuracionEndpoints } = require('./endpoints');
const fs = require('fs');
const axios = require('axios').default;
const intervaloProceso = 60000; //1 min
let contadorRezagados = 0;
let pausarRezagados = false;

let elementosSinEnviar = [];

let jsonCIATEQDefault = {
    fecha: new Date(),
    valoresAire: {
        pm10: 0,
        pm25: 0,
        o3: 0,
        so2: 0,
        no2: 0,
        co: 0,
        c6h6: 0,
        humedadRelativa: 0,
        temperatura: 0
    },

    valoresAgua: {
        ph: 0,
        conductividad: 0,
        oxiDisuelto: 0,
        pb: 0,
        cd: 0,
        turbidez: 0,
        temperatura: 0
    }
};

//Encabezado para peticion en API de TTN
const headers = {
    headers: {
        'Accept': 'text/event-stream',
        "Authorization": "Bearer NNSXS.YIVTXIFRYE65FY2MMGKAVVCMRFPNAZXMP7VWRIQ.UJTMOPGL7XG6OHAOOBTXD4Y563TJG5UWB6WOUABUBEHISKU5TRGA" 
    }
}

/**
 * Guarda la información enviada en un archivo CSV. Activar dentro de la funcion de obtenerDatos en caso de querer generar el CSV.
 * 
 * @param {Datos separados por comas} fila Debe contar con los datos de cada columna del CSV: Estacion, Grupo, FechaHora, Temperatura, Humedad Relativa, no2, co, o3, so2, c6h6, pm10, pm25
 */

function getFechaHoraActual(){
    return `${new Date(Date.now()).toLocaleDateString('es-MX')}`;
}
function guardarFila(fila){
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
        fs.appendFile(nombreArchivo, fila, function (err) {
            if (err) throw err;
        }); 
    }catch(err){
        console.log(`[${getFechaCIATEQ(new Date())}] Error al guardar fila en archivo. ${err}`);
    }
}

/**
 * Obtiene los valores de la ultima medición de cada elemento, genera el promedio y lo envía
 * 
 * @param {Objeto con lista de estaciones} estacion 
 */
async function obtenerDatos(estacion){

    console.log(`Obteniendo valores de estacion: ${estacion.nombre}...`);
    let resTTN = await axios.get(`https://nam1.cloud.thethings.network/api/v3/as/applications/prueba3/devices/${estacion.idSensor}/packages/storage/`, headers);
    if(resTTN.status == 200){
        if(resTTN.data == ""){            
            console.log(`[${getFechaHoraActual()}] Por el momento no hay datos disponibles en la estacion ${estacion.nombre}`);
        }else{
            let datosEstacion = resTTN.data.split("\n");
            let dt = datosEstacion.reverse();
            //console.log(datosEstacion[0]);
            console.log(datosEstacion[1]);
            let fechaIni = new Date(Date.now());
            let fechaFin = new Date(Date.now()); 
            fechaFin = new Date(fechaFin.setHours(fechaFin.getHours() + 1));
            
            for(let elementoEstacion of datosEstacion){ //Busco el valor mas actual de la lista y si lo encuentro, lo guardo y envío
                try{
                    /*console.log("---------------------------------");
                    console.log("Valor de elemento obtenido: ");
                    console.log(elementoEstacion);
                    console.log("---------------------------------");*/
                    let tmp = {...jsonCIATEQDefault};
                    let jsonDatoEstacion = JSON.parse(elementoEstacion);
                    let fechaElemento = new Date(jsonDatoEstacion.result.uplink_message.received_at);
                                        
                    //Guardando valor
                    console.log(`fecha ini: ${fechaIni}`);
                    console.log(`fecha fin: ${fechaFin}`);
                    console.log(`fecha elemento: ${fechaElemento}`);
                    
                    //if(fechaElemento.getTime() >= fechaIni.getTime() && fechaElemento.getTime() <= fechaFin.getTime()){ 

                        console.log(`Encontré elemento. Revisando si es sensor de aire o de agua`);
                        tmp.fecha = new Date(fechaElemento.getTime());
                        
                        if(jsonDatoEstacion.result.uplink_message.decoded_payload.hasOwnProperty("accelerometer_1")){
                            console.log("Sensor de aire");
                            tmp.valoresAire.so2 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_1.x));
                            tmp.valoresAire.co = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_1.y));
                            tmp.valoresAire.no2 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_1.z));
                            tmp.valoresAire.o3 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_2.x));
                            tmp.valoresAire.c6h6 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_2.y));
                            tmp.valoresAire.pm10 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_3.y));
                            tmp.valoresAire.pm25 = Math.abs(parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.accelerometer_3.x));
                            tmp.valoresAire.humedadRelativa = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.relative_humidity_4);
                            tmp.valoresAire.temperatura = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.temperature_5);
                            
                            if (isNaN(tmp.valoresAire.temperatura)){
                                temperatura = 0;
                            }
                
                            if(isNaN(tmp.valoresAire.humedadRelativa)){
                                humedadRelativa = 0;
                            }
                        }else{ //Guardando valores de agua
                            console.log("Sensor de agua");
                            tmp.valoresAgua.ph = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_1);
                            tmp.valoresAgua.conductividad = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_2);
                            tmp.valoresAgua.oxiDisuelto = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_3);
                            tmp.valoresAgua.pb = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_4);
                            tmp.valoresAgua.cd = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_5);
                            tmp.valoresAgua.turbidez = parseFloat(datoEstacion.result.uplink_message.decoded_payload.analog_out_6);
                            tmp.valoresAgua.temperatura = parseFloat(datoEstacion.result.uplink_message.decoded_payload.temperature_7);
                        }

                        console.log(`[${getFechaHoraActual()}] JSON por enviar... `);
                        console.log(JSON.stringify(getJSON_CIATEQ(tmp, estacion)));
                        //await enviarDatosCIATEQ(getJSON_CIATEQ(tmp, estacion));

                        break;
                    //}
                }catch(error){
                    //console.log(`Error  al guardar información de un dato de estacion. ${error}`);
                    //console.log("Buscando nuevos valores...");
                }
            }
        }
    }else{
        console.log("Error al obtener información de los sensores.");
    }
}

function getJSON_CIATEQ(valores, estacion){
    return {
        "stationInformation" :
        {
            "description" : estacion.nombre,
            "idGroup" : `${estacion.idEstacion}`,
            "sendingTimeStamp" : getFechaCIATEQ(valores.fecha),
            "latitude" : estacion.latitud,
            "longitude" : estacion.longitud,
            "altitude" : estacion.altitud
        },
        "environmentalInformation" :
        {
            "variables" :
            [
                {
                    "temperature" : 
                    {
                        "value" : valores.valoresAire.temperatura
                    }
                },
                {
                    "humidity" : 
                    {
                        "value" : valores.valoresAire.humedadRelativa
                    }
                }
            ]
        },
        "airPollutants" : 
        [
            {
                "pm25" : 
                {
                    "value" : valores.valoresAire.pm25
                }
            },
            {
                "pm10" :
                {
                    "value" : valores.valoresAire.pm10
                }
            },
            {
                "no2" :
                {
                    "value" : valores.valoresAire.no2
                }
            },
            {
                "co" :
                {
                    "value" : valores.valoresAire.co
                }
            },
            {
                "o3" :
                {
                    "value" : valores.valoresAire.o3
                }
            },
            {
                "so2" :
                {
                    "value" : valores.valoresAire.so2
                }
            },
            {
                "c6h6" :
                {
                    "value" : valores.valoresAire.c6h6
                }
            }
        ],
        "waterIndicators" :
        [
            {
                "ph" : 
                {
                    "value" : valores.valoresAgua.ph
                }
            },
            {
                "pb" : 
                {
                    "value" : valores.valoresAgua.pb
                }
            },
            {
                "conductivity" : 
                {
                    "value" : valores.valoresAgua.conductividad
                }
            },
            {
                "dissolvedOxygen" : 
                {
                    "value" : valores.valoresAgua.oxiDisuelto
                }
            },
            {
                "temperature" :
                {
                    "value" : valores.valoresAgua.temperatura
                }
            },
            {
                "cd" :
                {
                    "value" : valores.valoresAgua.cd
                }
            },
            {
                "haze" :
                {
                    "value" : valores.valoresAgua.turbidez
                }
            }
        ]
    }            
}

/**
 * Busca datos rezagados en caso de que no se hayan podido enviar
 * 
 */
async function enviarDatosRezagados(){
    if(elementosSinEnviar.length > 0){
        var pausarRezagados = false
        contadorRezagados = 0;
        console.log(`[${getFechaCIATEQ(new Date())}] Se encontraron ${elementosSinEnviar.length} elementos rezagados. Se intentarán enviar...`);
        while(elementosSinEnviar.length > 0 && pausar != false){
            datos = elementosSinEnviar.pop();
            
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
                            console.log(`[${getFechaCIATEQ(new Date())}] Elemento ${contadorRezagados} de ${elementosSinEnviar.length-1} enviado satisfactoriamente`);
                            contadorRezagados++;
                        }else{
                            console.log(`[${getFechaCIATEQ(new Date())}] Hubo un error al enviar informacion rezagada al servidor ${configuracionEndpoints[i].nombre}. El JSON se guardará para enviarse despues. ${response.status}`);
                            elementosSinEnviar.push(datos);
                            pausarRezagados = true;
                        } 
                    }).catch(function (error) {
                        console.log(`[${getFechaCIATEQ(new Date())}] Error subiendo el JSON al servidor ${configuracionEndpoints[i].nombre}. Se guardará para enviarse despues. ${error}`);
                        elementosSinEnviar.push(datos);
                        pausarRezagados = true;
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

/**
 * Envía los datos a los endpoints guardados
 * 
 * @param {objeto con informacion} datos información que se enviará a los servidores configurados 
 */
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
                    elementosSinEnviar.push(datos);
                    configuracionEndpoints[i].conToken = false;
                });
            }).catch(function (error) {
                console.log(`[${getFechaCIATEQ(new Date())}] Error obteniendo el token de conexion para el servidor ${configuracionEndpoints[i].nombre}. El JSON se guardará para enviarse despues. ${error}`);
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
      return `0${dia.getDate()}`
    } else {
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
    //setInterval(async()=> {
        //console.log(`[${getFechaCIATEQ(new Date())}] Verificando elementos sin enviar...`);
        //await enviarDatosRezagados();
        
        for(let estacion of estaciones){
            console.log(`[${getFechaHoraActual()}] Revisando: ${estacion.idSensor}`);
            await obtenerDatos(estacion);
        }
    //}, intervaloProceso);
}

main();