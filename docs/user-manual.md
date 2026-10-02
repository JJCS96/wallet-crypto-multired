# Manual de Usuario - NovaWallet

## 1. Portada

**Nombre del sistema:** NovaWallet

**Descripción breve:** wallet web multired para gestionar activos digitales en redes de prueba desde una interfaz moderna, segura y fácil de usar.

**Versión:** MVP académico

**Entorno:** redes de prueba / testnet

---

## 2. Introducción

NovaWallet es una wallet multired web que permite gestionar activos digitales en redes de prueba, consultar saldos, recibir fondos, enviar fondos y revisar historial de movimientos.

La aplicación está pensada como una demostración académica de una wallet no custodial. Esto significa que el usuario conserva el control de su frase semilla y de sus claves, mientras NovaWallet facilita la interacción con diferentes redes blockchain de prueba.

Los activos mostrados no tienen valor comercial real y se usan únicamente con fines de aprendizaje, demostración y sustentación.

## 3. Objetivo del manual

Este manual guía al usuario final en el uso de NovaWallet y explica, de forma clara, cómo acceder al sistema, crear o restaurar una wallet, recibir fondos, enviar activos, revisar el historial y comprender los aspectos básicos de seguridad.

No está orientado al código fuente ni a la arquitectura interna, sino al uso funcional de la aplicación.

## 4. Requisitos para usar NovaWallet

Para utilizar NovaWallet se necesita:

1. Un navegador web actualizado.
2. Conexión a internet.
3. Una cuenta Google para iniciar sesión.
4. Acceso a la URL de la aplicación.
5. Fondos de prueba desde faucets, si se desea probar envíos.
6. Uso exclusivo de redes de prueba.

**Importante:** no se deben usar fondos reales en NovaWallet. Esta versión está diseñada para testnet y devnet.

## 5. Acceso al sistema

Para ingresar a NovaWallet:

1. Abrir el navegador web.
2. Ingresar a la URL de NovaWallet.
3. Hacer clic en iniciar sesión con Google.
4. Elegir la cuenta Google que se desea usar.
5. Autorizar el acceso solicitado por la aplicación.

Si es la primera vez que el usuario ingresa, NovaWallet solicitará crear una wallet nueva o restaurar una existente. Si la wallet ya está configurada en el dispositivo, el usuario accederá directamente al dashboard después del inicio de sesión.

La cuenta Google sirve para identificar al usuario dentro de la aplicación, pero no recupera la frase semilla ni reemplaza la seguridad de la wallet.

## 6. Crear una wallet

La creación de una wallet permite generar una nueva frase semilla y preparar el vault local cifrado.

Pasos para crear una wallet:

1. Iniciar sesión en NovaWallet con Google.
2. Seleccionar la opción **Crear wallet**.
3. Visualizar la frase semilla de 12 palabras.
4. Guardar la frase en un lugar seguro y fuera del dispositivo, si es posible.
5. Confirmar la frase siguiendo las instrucciones de la aplicación.
6. Crear una contraseña de wallet.
7. Confirmar la contraseña, si la aplicación lo solicita.
8. Finalizar el proceso.

La contraseña de wallet se utiliza para desbloquear temporalmente el vault local cuando se necesita firmar una transacción. No reemplaza a la frase semilla.

**Advertencia importante:** la frase semilla es la única forma de recuperar la wallet. NovaWallet no puede recuperarla si el usuario la pierde.

## 7. Restaurar wallet

La restauración permite recuperar una wallet existente usando su frase semilla de 12 palabras.

Pasos para restaurar una wallet:

1. Iniciar sesión en NovaWallet con Google.
2. Seleccionar la opción **Restaurar Wallet**.
3. Ingresar las 12 palabras en el orden correcto.
4. Validar la frase según las indicaciones de la aplicación.
5. Crear una nueva contraseña de wallet para ese dispositivo.
6. Generar nuevamente el vault local cifrado.
7. Finalizar la restauración y acceder al dashboard.

Restaurar la wallet es necesario si:

1. Se cambia de dispositivo.
2. Se elimina el vault local.
3. Se limpia la información del navegador.
4. Se reinstala la aplicación o se borra el almacenamiento local.
5. Se necesita recuperar el acceso a la wallet.

Al restaurar, NovaWallet vuelve a derivar las direcciones públicas asociadas a la frase semilla y crea un nuevo vault local protegido con la contraseña definida por el usuario.

## 8. Dashboard

El dashboard es la pantalla principal de NovaWallet. Desde esta vista el usuario puede revisar el estado general de su wallet.

El dashboard muestra:

1. Balance total estimado.
2. Resumen de activos disponibles.
3. Saldos por red o activo.
4. Actividad reciente.
5. Indicaciones relacionadas con redes de prueba.

El balance total en USD es informativo y no representa dinero real. Los activos operan en redes de prueba, por lo que no tienen valor comercial.

Si algún saldo no se muestra o tarda en actualizarse, puede deberse a la disponibilidad de la red, del RPC o de una API externa utilizada para consultar información.

## 9. Módulo Recibir

El módulo **Recibir** permite obtener la dirección pública de la wallet para recibir fondos de prueba.

Pasos para recibir fondos:

1. Ingresar al módulo **Recibir**.
2. Seleccionar la red o el activo que se desea recibir.
3. Revisar la dirección pública mostrada.
4. Copiar la dirección pública.
5. Usar el código QR, si está disponible.
6. Compartir la dirección con un faucet o con otra wallet de prueba.

Direcciones por red:

| Red | Formato de dirección |
| --- | --- |
| Solana Devnet | Dirección Solana |
| BNB Smart Chain Testnet | Dirección `0x` |
| Bitcoin Testnet | Dirección `tb1` |

**Advertencia:** no se deben enviar fondos de una red a una dirección de otra red. Por ejemplo, no se debe enviar BTC Testnet a una dirección de BNB ni tBNB a una dirección de Solana.

## 10. Módulo Enviar

El módulo **Enviar** permite transferir fondos de prueba desde NovaWallet hacia otra dirección compatible.

Pasos para enviar fondos:

1. Ingresar al módulo **Enviar**.
2. Seleccionar la red.
3. Seleccionar el activo.
4. Ingresar la dirección destino.
5. Ingresar el monto a enviar.
6. Revisar la comisión o costo de red mostrado por la aplicación.
7. Ingresar la contraseña de wallet.
8. Confirmar el envío.
9. Esperar la confirmación de la transacción.

La contraseña de wallet desbloquea temporalmente el vault local para poder firmar la transacción. La firma ocurre localmente en el navegador. La frase semilla no se envía a servidores ni se solicita en cada envío.

Antes de confirmar una transacción, el usuario debe verificar:

1. Que la red seleccionada sea correcta.
2. Que el activo seleccionado sea correcto.
3. Que la dirección destino sea compatible con la red.
4. Que el monto sea el deseado.
5. Que exista saldo suficiente para cubrir el envío y la comisión de red.

## 11. Historial y actividad reciente

El historial permite revisar los movimientos relacionados con la wallet.

La información mostrada puede incluir:

| Campo | Descripción |
| --- | --- |
| Tipo | Indica si el movimiento fue enviado o recibido. |
| Red | Red blockchain asociada a la transacción. |
| Activo | Activo transferido, como SOL, tBNB, BTC Testnet o tokens configurados. |
| Monto | Cantidad enviada o recibida. |
| Estado | Situación de la transacción, como pendiente, confirmada o fallida. |
| Hash | Identificador público de la transacción. |
| Explorer | Enlace para revisar la transacción en un explorador blockchain. |
| Fecha | Fecha y hora del movimiento. |

La opción de actualizar actividad permite consultar nuevamente la información disponible desde la red o desde los servicios externos configurados.

Si una red no responde, la actividad puede tardar en actualizarse o mostrarse parcialmente. Esto no significa necesariamente que los fondos se hayan perdido; puede tratarse de una demora temporal del servicio consultado.

## 12. Configuración

El módulo **Configuración** permite revisar información general de la cuenta, el estado de seguridad de la wallet y el estado del sistema.

En esta sección se puede encontrar:

1. Información de la cuenta del usuario.
2. Estado de seguridad de la wallet.
3. Estado del vault local, como activo o no configurado.
4. Opción para eliminar el vault local.
5. Estado general del sistema.
6. Estado de redes y tokens configurados.

Eliminar el vault local no elimina la wallet pública ni borra las direcciones blockchain. Sin embargo, impide firmar nuevas transacciones desde ese dispositivo hasta que la wallet sea restaurada con la frase semilla.

Antes de eliminar el vault local, el usuario debe asegurarse de tener guardada correctamente su frase semilla.

## 13. Seguridad de NovaWallet

NovaWallet está diseñada para que el usuario mantenga el control de su wallet. Para entender su seguridad, es importante conocer los siguientes conceptos:

**Frase semilla:** conjunto de 12 palabras que permite recuperar la wallet. Es el dato más importante de la cuenta. Cualquier persona que tenga acceso a la frase semilla podría restaurar la wallet.

**Vault local:** almacenamiento cifrado en el dispositivo del usuario. Guarda la frase semilla de forma protegida para que la aplicación pueda firmar transacciones cuando el usuario ingresa su contraseña.

**Contraseña de wallet:** clave creada por el usuario para desbloquear temporalmente el vault local. Esta contraseña no se guarda en Firebase y no debe compartirse.

Datos que **no** se guardan en Firebase:

1. Frase semilla.
2. Contraseña.
3. Private key.
4. Secret key.
5. Seed.

Datos que sí se pueden guardar:

1. Direcciones públicas.
2. Historial público.
3. Configuración no sensible.
4. Metadatos públicos necesarios para el funcionamiento de la aplicación.

La frase semilla se cifra localmente mediante el vault. Cuando el usuario envía fondos, NovaWallet usa la contraseña para desbloquear el vault de forma temporal y firmar la transacción localmente.

## 14. Redes soportadas

| Red | Activo | Estado |
| --- | --- | --- |
| Solana Devnet | SOL | Disponible |
| BNB Smart Chain Testnet | tBNB | Disponible |
| Bitcoin Testnet | BTC Testnet | Disponible |
| Solana Devnet | SPL Token / USDT-DEMO SPL | Configurable |
| BNB Testnet | BEP20 Token / USDT-DEMO BEP20 | Configurable |

Los tokens demo solo aparecen si están configurados en el entorno correspondiente. Si no están configurados, la aplicación puede mostrarlos como no disponibles o no mostrarlos según la vista.

## 15. Consideraciones importantes

Antes de utilizar NovaWallet, el usuario debe tener en cuenta:

1. La aplicación usa redes de prueba.
2. Los activos no tienen valor comercial real.
3. No se deben enviar fondos reales.
4. Los faucets pueden fallar, limitar fondos o demorar la entrega.
5. Algunas APIs externas pueden no responder temporalmente.
6. Los tokens demo solo aparecen si están configurados.
7. Las confirmaciones dependen de la red blockchain correspondiente.
8. La cuenta Google no reemplaza la frase semilla.
9. NovaWallet no puede recuperar una frase semilla perdida.

## 16. Errores comunes y soluciones

| Problema | Causa posible | Solución |
| --- | --- | --- |
| No aparece BTC en historial. | La API de Bitcoin Testnet no respondió, no hay movimientos o la transacción aún no fue detectada. | Esperar unos minutos y actualizar la actividad. Verificar la dirección en el explorer de Bitcoin Testnet. |
| Dirección Bitcoin incompatible. | Se ingresó una dirección que no pertenece a Bitcoin Testnet o no usa un formato compatible. | Usar una dirección Bitcoin Testnet válida, preferiblemente con formato `tb1`. |
| No tengo fondos para enviar. | La wallet no recibió fondos de prueba o el saldo no alcanza para cubrir monto y comisión. | Solicitar fondos desde un faucet de la red correspondiente y esperar la confirmación. |
| Contraseña incorrecta. | La contraseña ingresada no coincide con la usada para crear el vault local. | Revisar la contraseña. Si no se recuerda, restaurar la wallet con la frase semilla y crear una nueva contraseña. |
| No existe vault local. | Se eliminó el almacenamiento local, se cambió de navegador o se usa otro dispositivo. | Restaurar la wallet ingresando la frase semilla de 12 palabras. |
| Token SPL/BEP20 no aparece. | El token demo no está configurado en el entorno de la aplicación. | Verificar la configuración del token o usar los activos nativos disponibles. |
| No se pudo actualizar actividad. | La red, RPC o API externa no respondieron correctamente. | Intentar nuevamente más tarde y revisar la conexión a internet. |
| Balance estimado no disponible. | La consulta de saldos o precios no está disponible, o la red no respondió. | Actualizar la vista y recordar que el valor mostrado es informativo. |

## 17. Buenas prácticas del usuario

Para utilizar NovaWallet de forma segura se recomienda:

1. Guardar la frase semilla fuera del dispositivo, en un lugar privado y seguro.
2. No compartir la frase semilla con ninguna persona.
3. No compartir la contraseña de wallet.
4. Verificar la red antes de enviar fondos.
5. Verificar cuidadosamente la dirección destino.
6. Usar solo redes de prueba en esta versión.
7. No enviar fondos reales.
8. Cerrar sesión en equipos compartidos.
9. Evitar capturas de pantalla de la frase semilla.
10. Confirmar que los faucets correspondan a la red correcta.

## 18. Cierre

NovaWallet permite demostrar el funcionamiento completo de una wallet multired no custodial en un entorno de prueba. La aplicación integra inicio de sesión con Google, creación y restauración de wallet, vault local cifrado, consulta de saldos, recepción, envío e historial de activos en diferentes redes testnet.

Como MVP académico, NovaWallet facilita la sustentación del sistema al mostrar de forma práctica cómo un usuario puede interactuar con varias redes blockchain manteniendo el control de su frase semilla y utilizando mecanismos de seguridad locales.
