//Elementos de configuracion para envio de informacion a diferentes servidores
let configuracionEndpoints = [
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