# Guia de prueba de depositos USDT-DEMO

Esta guia sirve para probar depositos de tokens demo en NovaWallet sin usar
mainnet, USDT real ni fondos reales.

## Reglas de seguridad

- Usar solo Solana Devnet y BNB Smart Chain Testnet.
- No usar USDT real.
- No usar mainnet.
- No subir claves privadas al repositorio.
- No guardar frases semilla ni claves privadas en `.env.local`.
- Usar wallets temporales o testnet.

## Variables necesarias

```env
VITE_SOLANA_SPL_DEMO_MINT=
VITE_SOLANA_SPL_DEMO_SYMBOL=USDT-DEMO
VITE_SOLANA_SPL_DEMO_DECIMALS=6

VITE_BNB_TESTNET_RPC_URL=
VITE_BNB_BEP20_DEMO_CONTRACT=
VITE_BNB_BEP20_DEMO_SYMBOL=USDT-DEMO
VITE_BNB_BEP20_DEMO_DECIMALS=18
```

Si el mint SPL o el contrato BEP20 no estan configurados, NovaWallet no muestra
esos tokens en Dashboard, Mi Wallet, Enviar ni Recibir. El estado tecnico se
puede revisar en Configuracion.

## Solana Devnet: USDT-DEMO SPL

1. Inicia sesion en NovaWallet y abre `Recibir`.
2. Selecciona `SOL`.
3. Copia la direccion publica Solana de NovaWallet.
4. Ejecuta el script:

```bash
node scripts/create-spl-demo-token.js <DIRECCION_SOLANA_NOVAWALLET> 100
```

El script:

- Se conecta a Solana Devnet.
- Genera una wallet temporal en memoria.
- Solicita airdrop devnet para pagar fees.
- Crea un mint SPL con 6 decimales.
- Mintea USDT-DEMO al token account asociado de la direccion NovaWallet.
- Imprime el mint address, token account, firma y explorer.
- No guarda claves privadas.

5. Copia el `Mint address` en `apps/web/.env.local`:

```env
VITE_SOLANA_SPL_DEMO_MINT=<MINT_ADDRESS>
VITE_SOLANA_SPL_DEMO_SYMBOL=USDT-DEMO
VITE_SOLANA_SPL_DEMO_DECIMALS=6
```

6. Reinicia `npm run dev`.
7. Abre Dashboard o Mi Wallet.
8. Verifica que aparezca `USDT-DEMO SPL`.
9. Verifica balance.
10. Abre Historial o usa `Actualizar actividad`.

El sync SPL busca actividad en el ATA derivado del mint configurado y la
direccion Solana de NovaWallet. Si el deposito fue minteado al ATA correcto,
debe poder sincronizarse como actividad SPL cuando la red responda.

## BNB Smart Chain Testnet: USDT-DEMO BEP20

1. Abre NovaWallet > `Recibir`.
2. Selecciona `tBNB`.
3. Copia la direccion BNB `0x` de NovaWallet.
4. En Remix, despliega este contrato en BNB Smart Chain Testnet:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract USDTDemo {
    string public name = "USDT Demo";
    string public symbol = "USDT-DEMO";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 initialSupply) {
        totalSupply = initialSupply * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf[msg.sender] >= value, "Insufficient balance");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");

        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
}
```

Constructor sugerido:

```text
1000000
```

5. Copia la direccion del contrato en `apps/web/.env.local`:

```env
VITE_BNB_TESTNET_RPC_URL=<RPC_BNB_TESTNET_CHAIN_ID_97>
VITE_BNB_BEP20_DEMO_CONTRACT=<CONTRACT_ADDRESS>
VITE_BNB_BEP20_DEMO_SYMBOL=USDT-DEMO
VITE_BNB_BEP20_DEMO_DECIMALS=18
```

6. Desde Remix o MetaMask, transfiere USDT-DEMO BEP20 a la direccion BNB de
   NovaWallet.
7. Reinicia `npm run dev`.
8. Abre Dashboard o Mi Wallet.
9. Verifica que aparezca `USDT-DEMO BEP20`.
10. Verifica balance.
11. Abre Historial o usa `Actualizar actividad`.

El sync BEP20 lee eventos `Transfer` del contrato configurado mediante RPC de
BNB Testnet. Busca eventos entrantes y salientes asociados a la direccion `0x`
de NovaWallet.

## Checklist SPL

- Mint configurado en `.env.local`.
- `VITE_SOLANA_SPL_DEMO_SYMBOL=USDT-DEMO`.
- `VITE_SOLANA_SPL_DEMO_DECIMALS=6`.
- Token enviado a la direccion Solana de NovaWallet.
- Balance actualizado en Dashboard o Mi Wallet.
- Explorer Solana Devnet con firma confirmada.
- Actividad reciente actualizada si el sync SPL encuentra el ATA y la firma.

## Checklist BEP20

- Contrato configurado en `.env.local`.
- `VITE_BNB_BEP20_DEMO_SYMBOL=USDT-DEMO`.
- `VITE_BNB_BEP20_DEMO_DECIMALS=18`.
- RPC BNB Testnet configurado y apuntando a chainId 97.
- Token enviado a la direccion BNB `0x` de NovaWallet.
- Balance actualizado en Dashboard o Mi Wallet.
- Explorer BscScan Testnet con transaccion confirmada.
- Actividad reciente actualizada si el sync encuentra eventos `Transfer`.

## Errores comunes

- El token no aparece: falta mint/contrato en `.env.local` o no se reinicio Vite.
- Balance SPL en cero: el deposito fue a otra direccion o a otro mint.
- Balance BEP20 en cero: contrato incorrecto, red incorrecta o RPC no es chainId 97.
- Actividad SPL no aparece: la red RPC no devolvio firmas del ATA o aun no confirmo.
- Actividad BEP20 no aparece: el RPC no devuelve logs suficientes o el evento esta
  fuera del rango reciente configurado.
- Error de gas BEP20: la wallet emisora necesita tBNB testnet.
