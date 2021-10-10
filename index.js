const axios = require('axios').default;
//const intervaloProceso = 3600000; //1 Hora
const intervaloProceso =1000; //1 seg
let sensores = ['eui-70b3d57ed004607f']
let estacion = "Martires de Rio Blanco"
let latitud = 20.513908;
let longitud = -103.176030;
var jsonEnviado = {};

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
                    var datos = JSON.parse(datosSeparados[0]);
                    var fecha = new Date(datos.result.uplink_message.received_at);
                    if(fecha >= fechaIni && fecha <= fechaFin){
                        so2 += parseInt(datos.result.uplink_message.decoded_payload.accelerometer_1.x);
                        so2Count++;
                        co += parseInt(datos.result.uplink_message.decoded_payload.accelerometer_1.y);
                        coCount++;
                        no2 += parseInt(datos.result.uplink_message.decoded_payload.accelerometer_1.z);
                        no2Count++;
                    }
                }catch(error){
                    console.log("Error en generacion de datos: " + error);
                }
            }
            
            so2 = so2 / so2Count;
            co = co / coCount;
            no2 = no2 / no2Count;

            //console.log(j.result.uplink_message.decoded_payload.accelerometer_1.x);
            

            /*
            for(var i=0; i<datos.length; datos++){
                
            }
            await sacar(response.data[response.data.length-1].device_id, response.data[response.data.length-1].time)
            if(!similar){
                var elemento = {
                    _id: response.data[response.data.length-1].device_id,
                    numarete: "2-121 MS",
                    fecha: response.data[response.data.length-1].time,
                    temperatura: response.data[response.data.length-1].temperature_2,
                    gps: response.data[response.data.length-1].gps_3,
                    giroscopio: response.data[response.data.length-1].gyrometer_0,
                    acelerometro: response.data[response.data.length-1].accelerometer_1,
                    magnetometro: response.data[response.data.length-1].accelerometer_4
                }
                await axios.put(`http://localhost:5000/api/collares/`, elemento, {
                    headers: {
                        'Access-Control-Allow-Origin': '*'
                    }
                });
                console.log("Valor guardado en la BD");
            }*/
        }
    }).catch((error)=>{
        console.log(`Error al tratar de obtener la información: ${error}`);
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