const axios = require('axios').default;
//const intervaloProceso = 3600000; //1 Hora
const intervaloProceso =1000; //1 seg
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
            var so2Count = 0;
            var no2Count = 0;
            var coCount = 0;

            var datosCrudos = response.data;
            var datosSeparados = datosCrudos.split("\n");
            var fechaIni = new Date("2021-10-09T02:00:00Z"); //Cambiar a fecha-hora del dia
            var fechaFin = new Date("2021-10-09T03:00:00Z"); //cambiar a fecha hora del dia y quitar documentacion de sig linea
            //fechaFin = fechaFin.setHours(fechaFin.getHours() + 1);

            for(var i=0; i<datosSeparados.length; i++){
                try{
                    var datos = JSON.parse(datosSeparados[i]);
                    var fecha = new Date(datos.result.uplink_message.received_at);
                    //console.log("fecha obtenida: " + fecha);
                    //console.log("fecha Ini: " + fechaIni);
                    //console.log("fecha Fin: " + fechaFin);
                    if(fecha >= fechaIni && fecha <= fechaFin){
                        //console.log(datos.result.uplink_message.decoded_payload.accelerometer_1.x);
                        so2 += parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.x);
                        so2Count++;
                        //console.log(datos.result.uplink_message.decoded_payload.accelerometer_1.y);
                        co += parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.y);
                        coCount++;
                        //console.log(datos.result.uplink_message.decoded_payload.accelerometer_1.z);
                        no2 += parseFloat(datos.result.uplink_message.decoded_payload.accelerometer_1.z);
                        no2Count++;
                    }
                }catch(error){
                    
                }
            }

            //console.log("valor de SO2: " + so2);
            //console.log("valor de co: " + co);
            //console.log("valor de no2: " + no2);
            
            so2 = so2 / so2Count;
            co = co / coCount;
            no2 = no2 / no2Count;

            var so2Text = so2.toLocaleString('es-MX', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 5
            });

            var coText = co.toLocaleString('es-MX', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 5
            });

            var no2Text = no2.toLocaleString('es-MX', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 5
            });
            
            //console.log("so2Anterior: " + so2);
            console.log("so2Text: " + so2Text);
            console.log("coText: " + coText);
            console.log("no2Text: " + no2Text);

            var JSONCiateq = {
                "stationInformation" :
                {
                    "description" : estacion,
                    "idGroup" : "11",
                    "sendingTimeStamp" : new Date(),
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
                            "value" : no2Text
                        }
                    },
                    {
                        "co" :
                        {
                            "value" : coText
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
                            "value" : so2Text
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
              
            /*axios.request(opcionesObtenerLlave).then(function (response) {
                let headersEnvioJSON = {
                    "token-sx": reponse.data.token,
                    "Content-Type": "application/json" 
                }
                let opcionesEnvioJSON = {
                    url: "http://semadet.ciateq.net.mx:8080/semadet/api/mediciones",
                    method: "PUT",
                    headers: headersEnvioJSON,
                    data: JSONCiateq
                }
                axios.request(reqOptions).then(function (response) {
                    console.log("Elemento enviado satisfactoriamente");
                  })

            })*/
            
        }
    }).catch((error)=>{
        console.log(`Error al interactuar con la información obtenida: ${error}`);
    })
}

async function main () {
    /*setInterval(async()=> {
        for(var i=0; i<sensores.length; i++){
            console.log("Revisando: " + sensores[i]);
            await obtenerDatos(sensores[i]);
        }
        console.log("---------------------------------------------------------------------");
    }, intervaloProceso);*/
    for(var i=0; i<sensores.length; i++){
        console.log("Revisando: " + sensores[i]);
        await obtenerDatos(sensores[i]);
    }
    console.log("---------------------------------------------------------------------");
}

main();