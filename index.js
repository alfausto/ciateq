const axios = require('axios').default;
//const intervaloProceso = 3600000; //1 Hora
const intervaloProceso = 60000; //1 min
let sensores = ['eui-70b3d57ed004607f']
let estacion = "Martires de Rio Blanco"
let latitud = 20.513908;
let longitud = -103.176030;

let opcionesObtenerLlave = {
    url: "http://semadet.ciateq.net.mx:8080/semadet/api/seguridad/autenticar",
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    data: {
        usuario: "$uSuario_embed20$$",
        contrasena: "$cCOnTr0294_·M#",
    }
}

/**
 * Obtiene los valores de la ultima hora de cada elemento, genera el promedio y lo envía
 * @param {Identificador del collar} id 
 */
async function obtenerDatos(id){
    let headersList = {
        'Accept': 'text/event-stream',
        "Authorization": "Bearer NNSXS.YIVTXIFRYE65FY2MMGKAVVCMRFPNAZXMP7VWRIQ.UJTMOPGL7XG6OHAOOBTXD4Y563TJG5UWB6WOUABUBEHISKU5TRGA" 
    };
    console.log(`Obteniendo valores de sensor: ${id}...`);
    await axios.get(`https://nam1.cloud.thethings.network/api/v3/as/applications/prueba3/devices/${id}/packages/storage/`, {
        headers: headersList
    }).then(async (response)=>{
        if(response.data == ""){            
            console.log("No hay datos disponibles por el momento...")
        }else{
            var pm10 = 0; //Aun no se recibe
            var pm25 = 0; //Aun no se recibe
            var o3 = 0; //Aun no se recibe
            var so2 = 0;
            var no2 = 0;
            var co = 0;
            
            var datosCrudos = response.data;
            var datosSeparados = datosCrudos.split("\n");
            console.log("Datos separados: " + datosSeparados.length);
            //var fechaIni = new Date("2021-10-11T14:53:00Z"); //Test
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
                        so2 = parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.x);
                        co = parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.y);
                        no2 = parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.z);
                        break; //Desactivar break para envio masivo
                    }
                }catch(error){
                    
                }
            } //Llave del FOR: Activar cuando se envia de solo 1. Desactivar cuando hagamos envio masivo
            
            console.log("so2: " + so2);
            console.log("co: " + co);
            console.log("no2: " + no2);

            var JSONCiateq = {
                "stationInformation" :
                {
                    "description" : estacion,
                    "idGroup" : "4",
                    "sendingTimeStamp" : getFechaCIATEQ(fecha),
                    "latitude" : latitud,
                    "longitude" : longitud,
                    "altitude" : 2200
                },
                "environmentalInformation" :
                {
                    "variables" :
                    [
                        {
                            "temperature" : 
                            {
                                "value" : 0
                            }
                        },
                        {
                            "humidity" : 
                            {
                                "value" : 0
                            }
                        }
                    ]
                },
                "airPollutants" : 
                [
                    {
                        "pm25" : 
                        {
                            "value" : 0
                        }
                    },
                    {
                        "pm10" :
                        {
                            "value" : 0
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
                            "value" : 0
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
                            "value" : 0
                        }
                    }
                ],
                "waterIndicators" :
                [
                    {
                        "ph" : 
                        {
                            "value" : 5
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

            console.log(JSON.stringify(JSONCiateq));
              
            axios.request(opcionesObtenerLlave).then(function (response) {
                //console.log("token: " + response.data.msg.token);
                let headersEnvioJSON = {
                    "token-sx": response.data.msg.token,
                    "Content-Type": "application/json" 
                }
                let opcionesEnvioJSON = {
                    url: "http://semadet.ciateq.net.mx:8080/semadet/api/mediciones",
                    method: "PUT",
                    headers: headersEnvioJSON,
                    data: JSONCiateq
                }
                axios.request(opcionesEnvioJSON).then(function (response) {
                    if(response.status == 200){
                        console.log("Elemento enviado satisfactoriamente");
                    }else{
                        console.log("Hubo un error al enviar la información. El codigo de error fue: " + response.status)
                    } 
                });
            });
            //} //Llave de FOR. Desactivar con envio de solo 1. Activar cuando se usa envio masivo
        }
    }).catch((error)=>{
        console.log(`Error al interactuar con la información obtenida: ${error}`);
    })
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

async function main () {
    setInterval(async()=> {
        for(var i=0; i<sensores.length; i++){
            console.log("Revisando: " + sensores[i]);
            await obtenerDatos(sensores[i]);
        }
        console.log("---------------------------------------------------------------------");
    }, intervaloProceso);
    /*for(var i=0; i<sensores.length; i++){
        console.log("Revisando: " + sensores[i]);
        await obtenerDatos(sensores[i]);
    }
    console.log("---------------------------------------------------------------------");*/
}

main();