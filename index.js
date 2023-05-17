/**
 * Servicio de obtención de información de las estaciones de monitoreo
 */

const { estaciones } = require('./estaciones');
const fs = require('fs');
const axios = require('axios').default;
const intervaloProceso = 60000; //1 min
let contadorRezagados = 0;
let contadorSubidos = 0;

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

let configuracionEndpoints = [
    {
        nombre: "SEMADET",
        token: null,
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
        token: null,
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
 * @param {Objeto con valores de una estacion obtenida del archivo de estaciones.js} estacion 
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
                    //console.log(`fecha ini: ${fechaIni}`);
                    //console.log(`fecha fin: ${fechaFin}`);
                    //console.log(`fecha elemento: ${fechaElemento}`);
                    
                    if(fechaElemento.getTime() >= fechaIni.getTime() && fechaElemento.getTime() <= fechaFin.getTime()){ 

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

                            if(tmp.valoresAire.so2 == 0 && tmp.valoresAire.co == 0 && tmp.valoresAire.no2 == 0 && tmp.valoresAire.o3 == 0 && tmp.valoresAire.c6h6 == 0 && 
                                tmp.valoresAire.pm10 == 0 && tmp.valoresAire.pm25 == 0 && tmp.valoresAire.humedadRelativa == 0 && tmp.valoresAire.temperatura == 0){
                                console.log(`[${getFechaHoraActual()}] Valores en 0 de la estacion ${estacion.nombre}. No se enviará nada`);
                                break;
                            }else{
                                console.log(`[${getFechaHoraActual()}] JSON por enviar... `);
                                console.log(JSON.stringify(getJSON_CIATEQ(tmp, estacion)));
                                await enviarDatosCIATEQ(getJSON_CIATEQ(tmp, estacion));
                                contadorSubidos++;
                                break;
                            }
                        }else{ //Guardando valores de agua
                            console.log("Sensor de agua");
                            tmp.valoresAgua.ph = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_1);
                            tmp.valoresAgua.conductividad = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_2);
                            tmp.valoresAgua.oxiDisuelto = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_3);
                            tmp.valoresAgua.pb = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_4);
                            tmp.valoresAgua.cd = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_5);
                            tmp.valoresAgua.turbidez = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.analog_out_6);
                            tmp.valoresAgua.temperatura = parseFloat(jsonDatoEstacion.result.uplink_message.decoded_payload.temperature_7);

                            if(tmp.valoresAgua.ph == 0 && tmp.valoresAgua.conductividad == 0 && tmp.valoresAgua.oxiDisuelto == 0 && tmp.valoresAgua.pb == 0 && tmp.valoresAgua.cd == 0 && 
                                tmp.valoresAgua.turbidez == 0 && tmp.valoresAgua.temperatura == 0){
                                console.log(`[${getFechaHoraActual()}] Valores en 0 de la estacion ${estacion.nombre}. No se enviará nada`);
                                console.log("-----------------------------------------------------------------------------------------")
                                break;
                            }else{
                                console.log(`[${getFechaHoraActual()}] JSON por enviar... `);
                                console.log(JSON.stringify(getJSON_CIATEQ(tmp, estacion)));
                                await enviarDatosCIATEQ(getJSON_CIATEQ(tmp, estacion));
                                console.log("-----------------------------------------------------------------------------------------")
                                contadorSubidos++;
                                break;
                            }
                        }
                    }
                }catch(error){
                    //Lanzado normalmente por JSON CON FORMATO INVALIDO. SE OMITE Y BUSCA SIGUIENTE.
                }
            }
            console.log(`Se subieron ${contadorSubidos} elemento(s)`);
        }
    }else{
        console.log(`Error intentando obtener información de la estacion ${estacion.nombre}. Se intentará de nuevo en la siguiente corrida...`);
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
        let hayTokens = true;
        contadorRezagados = 1;

        console.log(`[${getFechaHoraActual()}] Se encontraron ${elementosSinEnviar.length} elementos rezagados. Se intentarán enviar...`);
        
        for(let t of configuracionEndpoints){
            hayTokens = hayTokens && (t.token != null);
        }

        if(hayTokens){
            while(elementosSinEnviar.length > 0){
                let jsonSinEnviar = elementosSinEnviar.pop();
            
                for(let servidor of configuracionEndpoints){
                    let headersEnvioJSON = {
                        "token-sx": servidor.token,
                        "Content-Type": "application/json" 
                    };
                    let opcionesEnvioJSON = {
                        url: servidor.endpointEnvio,
                        method: "PUT",
                        headers: headersEnvioJSON,
                        data: jsonSinEnviar
                    };
                    let resEnvio = await axios.request(opcionesEnvioJSON);
                    if(resEnvio.status == 200){
                        console.log(`[${getFechaHoraActual()}] Elemento ${contadorRezagados} de ${elementosSinEnviar.length} enviado satisfactoriamente`);
                        contadorRezagados++;
                    }else{
                        console.log(`[${getFechaHoraActual()}] Hubo un error al enviar informacion rezagada al servidor ${servidor.nombre}. El JSON se guardará para enviarse despues.`);
                        elementosSinEnviar.push(datos);
                        break;
                    }
                }
            }
        }else{
            console.log(`[${getFechaHoraActual()}] Uno o mas tokens de los servidores registrados no se encuentra disponible. Se intentarán enviar los elementos en la proxima corrida...`);
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
    try{
        for(let endpoint of configuracionEndpoints){
            if(endpoint.token == null){
                let resKey = await axios.request(endpoint.opcionesObtenerLlave);
                if(resKey.status == 200){
                    endpoint.token = resKey.data.msg.token;
        
                    let headersEnvioJSON = {
                        "token-sx": endpoint.token,
                        "Content-Type": "application/json" 
                    };
                    
                    let opcionesEnvioJSON = {
                        url: endpoint.endpointEnvio,
                        method: "PUT",
                        headers: headersEnvioJSON,
                        data: datos
                    };  
                    
                    let resEnvio = await axios.request(opcionesEnvioJSON);
                    if(resEnvio.status == 200){
                        console.log(`[${getFechaHoraActual()}] Elemento enviado satisfactoriamente al servidor ${endpoint.nombre}`);
                    }else{
                        console.log(`[${getFechaHoraActual()}] Hubo un error al enviar la información al servidor ${endpoint.nombre}. El JSON se guardará para enviarse despues.`);
                        elementosSinEnviar.push(datos);
                        endpoint.token = null;
                    }
                }else{
                    console.log(`[${getFechaHoraActual()}] Hubo un error al obtener la llave del servidor ${endpoint.nombre}. El JSON se guardará para enviarse despues.`);
                    elementosSinEnviar.push(datos);
                    endpoint.token = null;
                }
            
            //Con Llave guardada en JSON
            }else{
                let headersEnvioJSON = {
                    "token-sx": endpoint.token,
                    "Content-Type": "application/json" 
                };
                let opcionesEnvioJSON = {
                    url: endpoint.endpointEnvio,
                    method: "PUT",
                    headers: headersEnvioJSON,
                    data: datos
                };
                
                let resEnvio = await axios.request(opcionesEnvioJSON);
                if(resEnvio.status == 200){
                    console.log(`[${getFechaHoraActual()}] Elemento enviado satisfactoriamente al servidor ${endpoint.nombre}`);
                }else{
                    console.log(`[${getFechaHoraActual()}] Hubo un error al enviar la información al servidor ${endpoint.nombre}. El JSON se guardará para enviarse despues.`);
                    elementosSinEnviar.push(datos);
                    endpoint.token = null;
                }
            }
        }
    }catch(err){
        console.log(`Error general el enviar datos a servidores preestablecidos. ${err}`);
        elementosSinEnviar.push(datos);
        endpoint.token = null;
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