const axios = require('axios').default;
const intervaloCollar = "1H"; //Cada cuando traerá datos el sensor
const intervaloProceso = 3600000; //1 Hora
let sensores = [];
let similar = false;
let dispositivos = ['eui-70b3d57ed004607f']
let estacion = "Martires de Rio Blanco"
let latitud = 20.513908;
let longitud = -103.176030;

/**
 * Obtiene un arreglo con los collares conectados a TTN
 */
async function obtenerSensores(){
    console.log("Obteniendo lista de sensores...");
    await axios.get('https://prueba_mkr_1300.data.thethingsnetwork.org/api/v2/devices', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key ttn-account-v2.U2uq9Hz-YBSENGiowcydhTsNIBX1ZVAJpae_vIuXzeg'
    }}).then((response)=>{
        //console.log(response.data);
        sensores = response.data;
        return response.data;
    }).catch((error)=>{
        console.log(`Error al tratar de obtener información de collares: ${error}`);
        return [];
    });
}

/**
 * Compara el el ultimo valor guardado en la base de datos con el proporcionado por ID y fecha. 
 * @param {Identificador del collar a revisar} id 
 * @param {fecha extraida del valor a revisar} fecha 
 */
async function compararValor(id, fecha){
    console.log("Verificando existencia en BD...")
    var datos = {
        id: id,
        fecha: fecha
    };
    await axios.post(`http://localhost:5000/api/collares/buscar`, datos, {
        headers: {
          'Access-Control-Allow-Origin': '*'
        }}).then((response)=>{
            if(parseInt(response.data) == 1){
                similar = true;
            }else{
                similar = false;
            }
        }).catch((error)=>{
            console.log(`Error al tratar de comparar: ${error}`);
            similar = false;
    })
}

/**
 * Obtiene los valores de la ultima hora de cada elemento, genera el promedio y lo envía
 * @param {Identificador del collar} id 
 */
async function enviarPromedio(id){
    console.log(`Obteniendo valores de la ultima hora del sensor ${id}...`);
    await axios.get(`https://prueba_mkr_1300.data.thethingsnetwork.org/api/v2/query/${id}?last=${intervaloCollar}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key ttn-account-v2.U2uq9Hz-YBSENGiowcydhTsNIBX1ZVAJpae_vIuXzeg'
    }}).then(async (response)=>{
        if(response.data == ""){            
            console.log("No hay datos disponibles por el momento...")
        }else{
            var datos = response.data;
            var pm10 = 0;
            var pm25 = 0;
            var o3 = 0;
            var so2 = 0;
            var no2 = 0;

            for(var i=0; i<datos.length; datos++){
                pm10 += datos[i].
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
            }
        }
    }).catch((error)=>{
        console.log(`Error al tratar de obtener la información: ${error}`);
    })
}

function main () {
    setInterval(async()=> {
        for(var i=0; i<sensores.length; i++){
            console.log("Revisando: " + sensores[i]);
            await enviarPromedio(collares[i]);
        }
        console.log("---------------------------------------------------------------------");
    }, intervaloProceso);
}

main();