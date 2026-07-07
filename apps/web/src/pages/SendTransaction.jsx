import { useEffect, useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import TransactionSummaryCard from "../components/transactions/TransactionSummaryCard";
import WalletEmptyState from "../components/wallet/WalletEmptyState";
import { APP_ROUTES } from "../constants/routes";
import { NETWORKS, SUPPORTED_NETWORK_IDS } from "../constants/networks";
import { ADMIN_WALLETS } from "../config/admin-wallets";
import { ASSET_IDS, getAssetById, getAssetsForNetwork, getDefaultAssetIdForNetwork } from "../config/assets";
import { ECONOMIC_MODEL } from "../config/economic-model";
import { getUserWallet } from "../services/user-wallets.service";
import { getBalanceByNetwork } from "../services/blockchain/balance.service";
import {
  estimateBitcoinTestnetTransfer,
  parseBtcAmountToSatoshis,
  sendSignedBitcoinTestnetTransfer,
} from "../services/blockchain/bitcoin.service";
import {
  estimateBep20DemoTransferFee,
  parseBep20TokenAmountToUnits,
  sendSignedBep20DemoTransfer,
} from "../services/blockchain/bep20.service";
import {
  BNB_TESTNET_CHAIN_ID,
  estimateBnbTransferFee,
  parseBnbAmountToWei,
  sendSignedBnbTransfer,
  weiToBnbNumber,
} from "../services/blockchain/bnb.service";
import {
  estimateSolanaTransferFee,
  isValidSolanaPublicKey,
  sendSignedSolanaTransfer,
} from "../services/blockchain/solana-rpc.service";
import {
  estimateSplDemoTransferFee,
  parseSplTokenAmountToUnits,
  sendSignedSplDemoTransfer,
} from "../services/blockchain/solana-token.service";
import {
  calculateSolanaFeesFromLamports,
  calculateTransactionFees,
  lamportsToSolNumber,
  parseSolToLamports,
} from "../services/transactions/fee.service";
import {
  createRealBnbTestnetTransaction,
  createRealBitcoinTestnetTransaction,
  createRealDevnetTransaction,
  createRealTokenTransaction,
  createSimulatedTransaction,
} from "../services/transactions/transactions.service";
import { isBitcoinMainnetAddress, isValidAddressForNetwork, isValidBitcoinTestnetAddress } from "../utils/address-validation";
import { deriveSolanaKeypair } from "../services/blockchain/solana.service";
import { isVaultAvailable, unlockEncryptedVault } from "../services/security/encrypted-vault.service";

function getWalletAddressForNetwork(wallet, networkId) {
  if (networkId === "solana") {
    return wallet?.solanaAddress || "";
  }

  if (networkId === "bitcoin") {
    return wallet?.bitcoinAddress || "";
  }

  if (networkId === "bnb") {
    return wallet?.bnbAddress || "";
  }

  return "";
}

function SendTransaction({ user }) {
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [networkId, setNetworkId] = useState("solana");
  const [assetId, setAssetId] = useState(ASSET_IDS.solanaNative);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [vaultAvailable, setVaultAvailable] = useState(false);
  const [vaultLoading, setVaultLoading] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(null);
  const [availableBalanceLamports, setAvailableBalanceLamports] = useState(null);
  const [availableBalanceWei, setAvailableBalanceWei] = useState(null);
  const [availableBalanceSatoshis, setAvailableBalanceSatoshis] = useState(null);
  const [availableBalanceUnits, setAvailableBalanceUnits] = useState(null);
  const [balanceSource, setBalanceSource] = useState("simulated");
  const [balanceError, setBalanceError] = useState("");
  const [lastTransactionResult, setLastTransactionResult] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadWallet() {
      setWalletLoading(true);

      try {
        const currentWallet = await getUserWallet(user.uid);

        if (isMounted) {
          setWallet(currentWallet);
        }
      } finally {
        if (isMounted) {
          setWalletLoading(false);
        }
      }
    }

    loadWallet();

    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  useEffect(() => {
    let isMounted = true;

    async function loadVaultState() {
      setVaultLoading(true);

      try {
        const result = await isVaultAvailable();

        if (isMounted) {
          setVaultAvailable(result);
        }
      } finally {
        if (isMounted) {
          setVaultLoading(false);
        }
      }
    }

    loadVaultState();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBalance() {
      const result = await getBalanceByNetwork(networkId, wallet, assetId);

      if (isMounted) {
        setAvailableBalance(result.balance);
        setAvailableBalanceLamports(
          typeof result.balanceLamports === "number" ? BigInt(result.balanceLamports) : null,
        );
        setAvailableBalanceWei(
          typeof result.balanceWei === "string" ? BigInt(result.balanceWei) : null,
        );
        setAvailableBalanceSatoshis(
          typeof result.balanceSatoshis === "number" ? BigInt(result.balanceSatoshis) : null,
        );
        setAvailableBalanceUnits(
          typeof result.balanceUnits === "string" ? BigInt(result.balanceUnits) : null,
        );
        setBalanceSource(result.source || "simulated");
        setBalanceError(result.error || "");
      }
    }

    loadBalance();

    return () => {
      isMounted = false;
    };
  }, [assetId, networkId, wallet]);

  const currentNetwork = NETWORKS[networkId];
  const currentAsset = getAssetById(assetId);
  const assetOptions = getAssetsForNetwork(networkId);
  const isTokenAsset = currentAsset.assetType === "token";
  const fromAddress = useMemo(
    () => getWalletAddressForNetwork(wallet, networkId),
    [networkId, wallet],
  );
  const displayedFromAddress = networkId === "bitcoin" && fromAddress && !isValidBitcoinTestnetAddress(fromAddress)
    ? "Dirección Bitcoin incompatible con Testnet"
    : fromAddress;
  const draftAmount = Number(amount) || 0;
  const draftFeeBreakdown = calculateTransactionFees(networkId, draftAmount);
  const draftTotalDebit = networkId === "bnb"
    ? draftAmount + draftFeeBreakdown.networkFee
    : networkId === "bitcoin"
      ? draftAmount + draftFeeBreakdown.networkFee
      : isTokenAsset
        ? draftAmount
        : draftFeeBreakdown.totalDebit;
  function resetPreview() {
    setPreview(null);
    setSuccessMessage("");
    setFormError("");
    setWalletPassword("");
  }

  function handleNetworkChange(nextNetworkId) {
    setNetworkId(nextNetworkId);
    setAssetId(getDefaultAssetIdForNetwork(nextNetworkId));
    setPreview(null);
    setFormError("");
  }

  async function handlePreviewTransaction(event) {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setLastTransactionResult(null);

    if (!wallet) {
      setFormError("Primero debes crear o restaurar una wallet para preparar transacciones.");
      return;
    }

    if (!networkId || !NETWORKS[networkId]) {
      setFormError("Selecciona una red válida.");
      return;
    }

    if (!currentAsset.configured) {
      setFormError("Token demo no configurado.");
      return;
    }

    if (networkId === "bitcoin" && !isValidBitcoinTestnetAddress(fromAddress)) {
      setFormError("La dirección Bitcoin de origen no pertenece a Testnet. Actualiza/restaura tu wallet para obtener una dirección tb1.");
      return;
    }

    if (!toAddress.trim()) {
      setFormError("Escribe una dirección destino.");
      return;
    }

    if (networkId === "bitcoin" && isBitcoinMainnetAddress(toAddress)) {
      setFormError("Bitcoin Testnet no acepta direcciones mainnet bc1. Usa una dirección destino tb1.");
      return;
    }

    if (!isValidAddressForNetwork(networkId, toAddress)) {
      setFormError("La dirección destino no coincide con la red seleccionada.");
      return;
    }

    const normalizedAmount = Number(amount);

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setFormError("Ingresa un monto mayor a cero.");
      return;
    }

    let feeBreakdown = calculateTransactionFees(networkId, normalizedAmount);
    let amountLamports = null;
    let amountWei = null;
    let amountSatoshis = null;
    let amountUnits = null;

    if (assetId === ASSET_IDS.solanaNative) {
      const adminWallet = ADMIN_WALLETS.solana;

      if (!adminWallet || adminWallet === "ADMIN_WALLET_SOLANA_PENDING" || !isValidSolanaPublicKey(adminWallet)) {
        setFormError("La wallet administrativa de Solana no está configurada correctamente.");
        return;
      }

      try {
        amountLamports = parseSolToLamports(amount);
        const provisionalFees = calculateSolanaFeesFromLamports(amountLamports);
        const realNetworkFeeLamports = await estimateSolanaTransferFee({
          fromAddress,
          toAddress: toAddress.trim(),
          amountLamports,
          adminWalletAddress: adminWallet,
          appFeeLamports: provisionalFees.appFeeLamports,
        });
        feeBreakdown = calculateSolanaFeesFromLamports(amountLamports, realNetworkFeeLamports);
      } catch (error) {
        if (error?.message === "invalid-sol-amount") {
          setFormError("Ingresa un monto válido de SOL con máximo 9 decimales.");
          return;
        }

        setFormError("No se pudo estimar la comisión real de Solana Devnet en este momento.");
        return;
      }
    }

    if (assetId === ASSET_IDS.solanaSplDemo) {
      try {
        amountUnits = parseSplTokenAmountToUnits(amount);
        const realNetworkFee = await estimateSplDemoTransferFee({
          fromAddress,
          toAddress: toAddress.trim(),
          amountUnits,
        });
        feeBreakdown = {
          ...calculateTransactionFees(networkId, normalizedAmount, {
            networkFee: realNetworkFee.networkFee,
          }),
          networkFee: realNetworkFee.networkFee,
          networkFeeLamports: realNetworkFee.networkFeeLamports.toString(),
          createsDestinationAta: realNetworkFee.createsDestinationAta,
          appFee: normalizedAmount * ECONOMIC_MODEL.appCommissionRate,
          totalDebit: normalizedAmount,
        };
      } catch (error) {
        if (error?.message === "spl-token-not-configured") {
          setFormError("Token demo no configurado.");
          return;
        }

        if (error?.message === "invalid-spl-amount") {
          setFormError(`Ingresa un monto válido de ${currentAsset.symbol}.`);
          return;
        }

        if (error?.message === "spl-source-token-account-missing") {
          setFormError("Tu wallet aún no tiene una cuenta asociada para este token SPL demo.");
          return;
        }

        if (String(error?.message || "").includes("insufficient")) {
          setFormError("Saldo insuficiente para cubrir el token SPL o la comisión de red en SOL Devnet.");
          return;
        }

        setFormError("No se pudo estimar el envío SPL demo en Solana Devnet.");
        return;
      }
    }

    if (assetId === ASSET_IDS.bnbNative) {
      try {
        amountWei = parseBnbAmountToWei(amount);
        const realNetworkFee = await estimateBnbTransferFee({
          fromAddress,
          toAddress: toAddress.trim(),
          amountWei,
        });
        feeBreakdown = {
          ...calculateTransactionFees(networkId, normalizedAmount, {
            networkFee: realNetworkFee.networkFee,
          }),
          networkFee: realNetworkFee.networkFee,
          networkFeeWei: realNetworkFee.networkFeeWei.toString(),
          gasLimit: realNetworkFee.gasLimit.toString(),
          gasPrice: realNetworkFee.gasPrice.toString(),
          totalDebit: normalizedAmount + realNetworkFee.networkFee,
        };
      } catch (error) {
        if (error?.message === "bnb-rpc-not-configured") {
          setFormError("Configura VITE_BNB_TESTNET_RPC_URL para enviar tBNB en BNB Smart Chain Testnet.");
          return;
        }

        if (error?.message === "bnb-invalid-chain") {
          setFormError("El RPC configurado para BNB no apunta a BNB Smart Chain Testnet (chainId 97).");
          return;
        }

        if (error?.message === "invalid-bnb-amount") {
          setFormError("Ingresa un monto válido de tBNB.");
          return;
        }

        setFormError("No se pudo estimar el gas real de BNB Smart Chain Testnet en este momento.");
        return;
      }
    }

    if (assetId === ASSET_IDS.bnbBep20Demo) {
      try {
        amountUnits = parseBep20TokenAmountToUnits(amount);
        const realNetworkFee = await estimateBep20DemoTransferFee({
          fromAddress,
          toAddress: toAddress.trim(),
          amountUnits,
        });
        feeBreakdown = {
          ...calculateTransactionFees(networkId, normalizedAmount, {
            networkFee: realNetworkFee.networkFee,
          }),
          networkFee: realNetworkFee.networkFee,
          networkFeeWei: realNetworkFee.networkFeeWei.toString(),
          gasLimit: realNetworkFee.gasLimit.toString(),
          gasPrice: realNetworkFee.gasPrice.toString(),
          appFee: normalizedAmount * ECONOMIC_MODEL.appCommissionRate,
          totalDebit: normalizedAmount,
        };
      } catch (error) {
        if (error?.message === "bep20-token-not-configured") {
          setFormError("Token demo no configurado.");
          return;
        }

        if (error?.message === "invalid-bep20-amount") {
          setFormError(`Ingresa un monto válido de ${currentAsset.symbol}.`);
          return;
        }

        if (error?.message === "insufficient-gas-funds") {
          setFormError("Saldo tBNB insuficiente para pagar el gas del envío BEP20 demo.");
          return;
        }

        if (error?.message === "insufficient-token-funds") {
          setFormError("Saldo insuficiente del token BEP20 demo seleccionado.");
          return;
        }

        if (error?.message === "bep20-contract-not-found") {
          setFormError("El contrato BEP20 demo no existe en BNB Smart Chain Testnet.");
          return;
        }

        setFormError("No se pudo estimar el gas del token BEP20 demo en BNB Testnet.");
        return;
      }
    }

    if (assetId === ASSET_IDS.bitcoinNative) {
      try {
        amountSatoshis = parseBtcAmountToSatoshis(amount);
        const realBitcoinFee = await estimateBitcoinTestnetTransfer({
          fromAddress,
          toAddress: toAddress.trim(),
          amountSatoshis,
        });
        feeBreakdown = {
          ...calculateTransactionFees(networkId, normalizedAmount, {
            networkFee: realBitcoinFee.networkFee,
          }),
          networkFee: realBitcoinFee.networkFee,
          networkFeeSatoshis: realBitcoinFee.feeSatoshis.toString(),
          feeRate: realBitcoinFee.feeRate,
          selectedInputCount: realBitcoinFee.selectedUtxos.length,
          changeSatoshis: realBitcoinFee.changeSatoshis.toString(),
          totalDebit: realBitcoinFee.totalDebit,
        };
      } catch (error) {
        if (error?.message === "invalid-bitcoin-amount") {
          setFormError("Ingresa un monto válido de BTC Testnet con máximo 8 decimales.");
          return;
        }

        if (error?.message === "bitcoin-amount-below-dust") {
          setFormError("El monto de Bitcoin Testnet queda por debajo del límite dust. Usa un monto mayor.");
          return;
        }

        if (error?.message === "bitcoin-change-below-dust") {
          setFormError("El cambio de Bitcoin quedaría por debajo de dust. Ajusta el monto para evitar una salida inválida.");
          return;
        }

        if (String(error?.message || "").toLowerCase().includes("insufficient")) {
          setFormError("Saldo insuficiente o UTXOs insuficientes para cubrir el envío y la comisión Bitcoin Testnet.");
          return;
        }

        setFormError("No se pudo estimar UTXOs y fee de Bitcoin Testnet en este momento.");
        return;
      }
    }

    if (networkId === "solana" && balanceError) {
      setFormError("No se pudo consultar el balance real de Solana Devnet. Intenta nuevamente en unos segundos.");
      return;
    }

    if (networkId === "bnb" && balanceError) {
      setFormError(balanceError);
      return;
    }

    if (networkId === "bitcoin" && balanceError) {
      setFormError("Balance no disponible. No se puede validar ni preparar un envío Bitcoin Testnet en este momento.");
      return;
    }

    if (typeof availableBalance !== "number") {
      setFormError("No hay un balance disponible para validar esta operación.");
      return;
    }

    if (assetId === ASSET_IDS.solanaNative && typeof availableBalanceLamports !== "bigint") {
      setFormError("No hay un balance real de Solana disponible para validar esta operación.");
      return;
    }

    if (assetId === ASSET_IDS.bnbNative && typeof availableBalanceWei !== "bigint") {
      setFormError("No hay un balance real de BNB Smart Chain Testnet disponible para validar esta operación.");
      return;
    }

    if (assetId === ASSET_IDS.bitcoinNative && typeof availableBalanceSatoshis !== "bigint") {
      setFormError("Balance no disponible. No hay UTXOs Bitcoin Testnet para validar esta operación.");
      return;
    }

    if (isTokenAsset && typeof availableBalanceUnits !== "bigint") {
      setFormError("No hay un balance real del token demo para validar esta operación.");
      return;
    }

    const hasInsufficientBalance = assetId === ASSET_IDS.solanaNative
      ? feeBreakdown.totalDebitLamports > availableBalanceLamports
      : assetId === ASSET_IDS.bnbNative
        ? amountWei + BigInt(feeBreakdown.networkFeeWei) > availableBalanceWei
        : assetId === ASSET_IDS.bitcoinNative
          ? amountSatoshis + BigInt(feeBreakdown.networkFeeSatoshis) > availableBalanceSatoshis
          : isTokenAsset
            ? amountUnits > availableBalanceUnits
          : feeBreakdown.totalDebit > availableBalance;

    if (hasInsufficientBalance) {
      setFormError(
        `Saldo insuficiente. Balance disponible: ${availableBalance} ${currentAsset.symbol}.`,
      );
      return;
    }

    setPreview({
      network: networkId,
      assetId,
      assetType: currentAsset.assetType,
      tokenStandard: currentAsset.tokenStandard,
      tokenSymbol: currentAsset.assetType === "token" ? currentAsset.symbol : null,
      tokenMint: currentAsset.tokenMint || null,
      tokenAddress: currentAsset.tokenAddress || null,
      networkLabel: currentNetwork.label,
      symbol: currentAsset.symbol,
      networkFeeSymbol: isTokenAsset
        ? networkId === "solana" ? "SOL" : "tBNB"
        : currentAsset.symbol,
      fromAddress,
      toAddress: toAddress.trim(),
      amount: networkId === "solana" ? lamportsToSolNumber(amountLamports) : normalizedAmount,
      amountLamports: amountLamports?.toString() || null,
      amountWei: amountWei?.toString() || null,
      amountSatoshis: amountSatoshis?.toString() || null,
      amountUnits: amountUnits?.toString() || null,
      networkFee: feeBreakdown.networkFee,
      networkFeeLamports: feeBreakdown.networkFeeLamports?.toString() || null,
      networkFeeWei: feeBreakdown.networkFeeWei || null,
      networkFeeSatoshis: feeBreakdown.networkFeeSatoshis || null,
      gasLimit: feeBreakdown.gasLimit || null,
      gasPrice: feeBreakdown.gasPrice || null,
      feeRate: feeBreakdown.feeRate || null,
      selectedInputCount: feeBreakdown.selectedInputCount || null,
      changeSatoshis: feeBreakdown.changeSatoshis || null,
      appFee: feeBreakdown.appFee,
      appFeeLamports: feeBreakdown.appFeeLamports?.toString() || null,
      appFeeRate: feeBreakdown.appFeeRate,
      appFeeMode: isTokenAsset ? "documented" : networkId === "bnb" ? "documented" : networkId === "bitcoin" ? "pending" : null,
      totalDebit: feeBreakdown.totalDebit,
      totalDebitLamports: feeBreakdown.totalDebitLamports?.toString() || null,
      chainId: networkId === "bnb" ? BNB_TESTNET_CHAIN_ID : null,
      adminWallet: isTokenAsset || networkId === "bitcoin" ? "No aplica en este activo" : ADMIN_WALLETS[networkId],
      availableBalance,
      balanceSource,
    });
  }

  async function handleConfirmTransaction(event) {
    event?.preventDefault();

    if (!preview) {
      setFormError("No hay una transacción preparada para confirmar. Vuelve a revisar el resumen.");
      return;
    }

    setConfirming(true);
    setFormError("");
    setSuccessMessage("");
    const unlockedVault = { mnemonic: "" };

    try {
      if (preview.network === "solana" || preview.network === "bnb" || preview.network === "bitcoin") {
        if (!vaultAvailable) {
          setFormError("No existe vault local en este dispositivo. Restaura tu wallet para crear una contraseña local.");
          return;
        }

        if (!walletPassword) {
          setFormError("Ingresa tu contraseña de wallet para autorizar el envío.");
          return;
        }

        unlockedVault.mnemonic = await unlockEncryptedVault(walletPassword);
      }

      if (preview.assetId === ASSET_IDS.solanaNative) {
        const keypair = deriveSolanaKeypair(unlockedVault.mnemonic);

        if (keypair.publicKey.toBase58() !== preview.fromAddress) {
          setFormError("El vault local no corresponde a la Wallet Solana de origen seleccionada.");
          return;
        }

        const result = await sendSignedSolanaTransfer({
          fromKeypair: keypair,
          toAddress: preview.toAddress,
          amountLamports: BigInt(preview.amountLamports),
          adminWalletAddress: preview.adminWallet,
          appFeeLamports: BigInt(preview.appFeeLamports),
        });
        const networkFeeLamports = result.networkFeeLamports ?? BigInt(preview.networkFeeLamports);

        await createRealDevnetTransaction(user.uid, {
          ...preview,
          networkFee: typeof result.networkFee === "number" ? result.networkFee : preview.networkFee,
          totalDebit: lamportsToSolNumber(
            BigInt(preview.amountLamports) + BigInt(preview.appFeeLamports) + networkFeeLamports,
          ),
          status: "success",
          signature: result.signature,
          explorerUrl: result.explorerUrl,
          slot: result.slot,
          blockTime: result.blockTime,
          confirmationStatus: result.confirmationStatus,
          appFeeMode: "on-chain",
        });

        setLastTransactionResult(result);
        setSuccessMessage("La transacción real en Solana Devnet y la Comisión NovaWallet on-chain fueron confirmadas correctamente.");
      } else if (preview.assetId === ASSET_IDS.solanaSplDemo) {
        const result = await sendSignedSplDemoTransfer({
          mnemonic: unlockedVault.mnemonic,
          expectedFromAddress: preview.fromAddress,
          toAddress: preview.toAddress,
          amountUnits: BigInt(preview.amountUnits),
        });

        await createRealTokenTransaction(user.uid, {
          ...preview,
          networkFee: typeof result.networkFee === "number" ? result.networkFee : preview.networkFee,
          totalDebit: preview.amount,
          status: "success",
          signature: result.signature,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          confirmationStatus: result.confirmationStatus,
          appFeeMode: "documented",
          mode: "real-devnet",
          tokenMint: result.tokenMint,
          tokenSymbol: result.tokenSymbol,
        });

        setLastTransactionResult(result);
        setSuccessMessage("La transacción SPL Demo en Solana Devnet fue confirmada correctamente.");
      } else if (preview.assetId === ASSET_IDS.bnbNative) {
        const result = await sendSignedBnbTransfer({
          mnemonic: unlockedVault.mnemonic,
          expectedFromAddress: preview.fromAddress,
          toAddress: preview.toAddress,
          amountWei: BigInt(preview.amountWei),
        });

        await createRealBnbTestnetTransaction(user.uid, {
          ...preview,
          chainId: result.chainId,
          networkFee: result.networkFee,
          totalDebit: weiToBnbNumber(BigInt(preview.amountWei) + BigInt(result.networkFeeWei)),
          status: "success",
          txHash: result.txHash,
          gasUsed: Number(result.gasUsed),
          gasPrice: result.gasPrice,
          explorerUrl: result.explorerUrl,
          confirmationStatus: result.confirmationStatus,
          appFeeMode: "documented",
        });

        setLastTransactionResult(result);
        setSuccessMessage("La transacción real en BNB Smart Chain Testnet fue confirmada correctamente.");
      } else if (preview.assetId === ASSET_IDS.bnbBep20Demo) {
        const result = await sendSignedBep20DemoTransfer({
          mnemonic: unlockedVault.mnemonic,
          expectedFromAddress: preview.fromAddress,
          toAddress: preview.toAddress,
          amountUnits: BigInt(preview.amountUnits),
        });

        await createRealTokenTransaction(user.uid, {
          ...preview,
          networkFee: result.networkFee,
          totalDebit: preview.amount,
          status: "success",
          txHash: result.txHash,
          gasUsed: Number(result.gasUsed),
          gasPrice: result.gasPrice,
          explorerUrl: result.explorerUrl,
          confirmationStatus: result.confirmationStatus,
          appFeeMode: "documented",
          mode: "real-testnet",
          tokenAddress: result.tokenAddress,
          tokenSymbol: result.tokenSymbol,
        });

        setLastTransactionResult(result);
        setSuccessMessage("La transacción BEP20 Demo en BNB Smart Chain Testnet fue confirmada correctamente.");
      } else if (preview.assetId === ASSET_IDS.bitcoinNative) {
        const result = await sendSignedBitcoinTestnetTransfer({
          mnemonic: unlockedVault.mnemonic,
          expectedFromAddress: preview.fromAddress,
          toAddress: preview.toAddress,
          amountSatoshis: BigInt(preview.amountSatoshis),
        });

        await createRealBitcoinTestnetTransaction(user.uid, {
          ...preview,
          networkFee: result.networkFee,
          feeRate: result.feeRate,
          totalDebit: Number(preview.amount) + result.networkFee,
          status: "success",
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
          confirmationStatus: result.confirmationStatus,
          appFeeMode: "pending",
        });

        setLastTransactionResult(result);
        setSuccessMessage("La transacción real en Bitcoin Testnet fue transmitida correctamente.");
      } else {
        await createSimulatedTransaction(user.uid, preview);
        setSuccessMessage("La transacción simulada quedó registrada en Firestore.");
      }

      setPreview(null);
      setToAddress("");
      setAmount("");
      setWalletPassword("");
    } catch (error) {
      if (error?.message === "vault-not-found") {
        setFormError("No existe vault local en este dispositivo. Restaura tu wallet para crear una contraseña local.");
      } else if (error?.message === "vault-unlock-failed") {
        setFormError("Contraseña incorrecta.");
      } else if (error?.message === "vault-storage-unavailable" || error?.message === "vault-crypto-unavailable") {
        setFormError("No fue posible desbloquear la wallet en este navegador.");
      } else if (error?.message === "timeout") {
        setFormError("La confirmación tardó demasiado. Revisa el explorer de la red o intenta nuevamente.");
      } else if (error?.message === "invalid-admin-wallet") {
        setFormError("La wallet administrativa de Solana no está configurada correctamente.");
      } else if (error?.message === "transaction-rejected") {
        setFormError("La transacción fue rechazada por la red seleccionada.");
      } else if (error?.message === "bnb-rpc-not-configured") {
        setFormError("Configura VITE_BNB_TESTNET_RPC_URL para enviar tBNB en BNB Smart Chain Testnet.");
      } else if (error?.message === "bnb-invalid-chain") {
        setFormError("El RPC configurado para BNB no apunta a BNB Smart Chain Testnet (chainId 97).");
      } else if (error?.message === "bnb-wallet-mismatch") {
        setFormError("El vault local no corresponde a la Wallet BNB de origen seleccionada.");
      } else if (error?.message === "bitcoin-wallet-mismatch") {
        setFormError("El vault local no corresponde a la Wallet Bitcoin Testnet de origen seleccionada.");
      } else if (error?.message === "bitcoin-broadcast-failed") {
        setFormError("La firma local se generó, pero la red Bitcoin Testnet rechazó el broadcast. Revisa UTXOs, fee o intenta nuevamente.");
      } else if (error?.message === "solana-wallet-mismatch") {
        setFormError("El vault local no corresponde a la Wallet Solana de origen seleccionada.");
      } else if (error?.message === "bep20-token-not-configured" || error?.message === "spl-token-not-configured") {
        setFormError("Token demo no configurado.");
      } else if (error?.message === "bep20-contract-not-found") {
        setFormError("El contrato BEP20 demo no existe en BNB Smart Chain Testnet.");
      } else if (error?.message === "insufficient-token-funds") {
        setFormError("Saldo insuficiente del token demo seleccionado.");
      } else if (error?.message === "insufficient-gas-funds") {
        setFormError("Saldo insuficiente para pagar la comisión de red del envío token.");
      } else if (String(error?.message || "").toLowerCase().includes("insufficient")) {
        setFormError("Saldo insuficiente para cubrir el envío y la comisión de red.");
      } else {
        setFormError("No se pudo completar la operación. Verifica tu saldo, contraseña y conexión RPC.");
      }
    } finally {
      unlockedVault.mnemonic = "";
      setConfirming(false);
    }
  }

  return (
    <AppShell
      user={user}
      title="Enviar"
      kicker="Operación de wallet"
      description="Prepara un envío desde tu Wallet. Solana Devnet, BNB Smart Chain Testnet y Bitcoin Testnet usan firma local, balance real disponible y explorers de red."
    >
      {walletLoading ? (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--loading">
            <p className="placeholder-copy">Cargando wallet para preparar transacciones...</p>
          </article>
        </section>
      ) : !wallet ? (
        <section className="placeholder-page">
          <article className="placeholder-card">
            <WalletEmptyState
              title="Necesitas una wallet antes de enviar fondos"
              description="Primero debes crear o restaurar una wallet para obtener direcciones públicas y habilitar este flujo."
              badge="Sin wallet activa"
              steps={[
                "Crea una wallet nueva o restaura una existente.",
                "Regresa aquí después de tener direcciones públicas.",
                "Las operaciones reales o simuladas se registrarán según la red seleccionada.",
              ]}
              primaryAction={{ to: APP_ROUTES.createWallet, label: "Crear wallet" }}
              secondaryAction={{ to: APP_ROUTES.restoreWallet, label: "Restaurar wallet" }}
            />
          </article>
        </section>
      ) : preview ? (
        <TransactionSummaryCard
          summary={preview}
          loading={confirming}
          onConfirm={handleConfirmTransaction}
          onReset={resetPreview}
          showConfirmButton={preview.network !== "solana" && preview.network !== "bnb" && preview.network !== "bitcoin"}
        >
          {preview.network === "solana" || preview.network === "bnb" || preview.network === "bitcoin" ? (
            <form className="seed-auth-form" style={{ marginTop: "22px" }} onSubmit={handleConfirmTransaction}>
              <p className="placeholder-kicker">Autorización</p>
              <h2 className="placeholder-title" style={{ fontSize: "1.2rem" }}>
                Autoriza el envío con tu contraseña de wallet
              </h2>
              <p className="placeholder-copy">
                NovaWallet desbloquea tu vault cifrado local solo en memoria para firmar esta transacción.
                Tu frase de recuperación no se muestra ni se guarda en Firebase.
              </p>

              <div className="form-group" style={{ marginTop: "18px" }}>
                <label htmlFor="wallet-password-confirm-send">Contraseña de wallet</label>
                <input
                  id="wallet-password-confirm-send"
                  className="wallet-field"
                  type="password"
                  value={walletPassword}
                  onChange={(event) => setWalletPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña local"
                />
              </div>

              <div className={`seed-auth-counter seed-auth-counter--${vaultAvailable ? "valid" : "warning"}`}>
                Vault local: <strong>{vaultLoading ? "Verificando..." : vaultAvailable ? "Activo" : "No configurado"}</strong>
                <span>
                  {vaultAvailable
                    ? "La firma se hará localmente después de desbloquear el vault."
                    : "Restaura tu wallet en este dispositivo para crear un vault local cifrado."}
                </span>
              </div>

              {formError ? (
                <div className="auth-error" style={{ marginTop: "18px", marginBottom: 0 }}>
                  {formError}
                </div>
              ) : null}

              <div className="auth-error seed-auth-security-note" style={{ marginTop: "18px", marginBottom: 0 }}>
                No compartas tu contraseña. Si pierdes este dispositivo o eliminas el vault, podrás restaurarlo con tu frase de recuperación.
              </div>

              <div className="placeholder-actions" style={{ marginTop: "18px" }}>
                <button className="auth-button" type="submit" disabled={confirming || vaultLoading || !vaultAvailable || !walletPassword}>
                  {confirming ? `Enviando en ${preview.networkLabel}...` : `Enviar en ${preview.networkLabel}`}
                </button>
                <button className="auth-button-secondary" type="button" disabled={confirming || !walletPassword} onClick={() => setWalletPassword("")}>
                  Limpiar contraseña
                </button>
              </div>
            </form>
          ) : null}
        </TransactionSummaryCard>
      ) : (
        <section className="placeholder-page">
          <article className="placeholder-card placeholder-card--accent">
            <p className="placeholder-kicker">Enviar</p>
            <h2 className="placeholder-title">Enviar desde tu wallet</h2>
            <p className="placeholder-copy">
              Selecciona la red, revisa tu Wallet origen y prepara el envío. Si eliges Solana podrás
              completar un envío real en Solana Devnet. Si eliges BNB podrás enviar tBNB real en
              BNB Smart Chain Testnet. Si eliges Bitcoin podrás enviar BTC Testnet real cuando existan UTXOs suficientes.
              Los tokens demo solo se habilitan cuando su contrato o mint está configurado.
            </p>
            <span className="placeholder-badge" style={{ marginTop: "18px" }}>
              Comisión NovaWallet: {ECONOMIC_MODEL.appCommissionPercentLabel}
            </span>
          </article>

          <article className="placeholder-card">
            {formError ? <div className="auth-error">{formError}</div> : null}
            {successMessage ? <div className="auth-success">{successMessage}</div> : null}
            {lastTransactionResult?.explorerUrl ? (
              <div className="placeholder-actions" style={{ marginBottom: "18px" }}>
                <a
                  className="auth-button auth-button-link"
                  href={lastTransactionResult.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en explorer
                </a>
              </div>
            ) : null}

            <form className="auth-form" onSubmit={handlePreviewTransaction}>
              <div className="form-group">
                <label htmlFor="network-select">Red</label>
                <select
                  id="network-select"
                  className="wallet-field"
                  value={networkId}
                  onChange={(event) => handleNetworkChange(event.target.value)}
                >
                  {SUPPORTED_NETWORK_IDS.map((id) => (
                    <option key={id} value={id}>
                      {NETWORKS[id].label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="asset-select">Activo</label>
                <select
                  id="asset-select"
                  className="wallet-field"
                  value={assetId}
                  onChange={(event) => setAssetId(event.target.value)}
                >
                  {assetOptions.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.symbol} - {asset.name}{asset.configured ? "" : " (Token demo no configurado)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="from-address">Dirección origen</label>
                <input
                  id="from-address"
                  type="text"
                  value={displayedFromAddress}
                  readOnly
                  className="wallet-field wallet-field--readonly"
                />
              </div>

              <div className="form-group">
                <label htmlFor="to-address">Dirección destino</label>
                <input
                  id="to-address"
                  type="text"
                  value={toAddress}
                  onChange={(event) => setToAddress(event.target.value)}
                  placeholder={`Dirección ${currentNetwork.label}`}
                  className="wallet-field"
                />
              </div>

              <div className="form-group">
                <label htmlFor="amount-input">Monto</label>
                <input
                  id="amount-input"
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={`0.00 ${currentAsset.symbol}`}
                  className="wallet-field"
                />
              </div>

              <article className="placeholder-card transaction-fee-card">
                <p className="placeholder-copy">
                  Balance disponible: <strong>{typeof availableBalance === "number" ? `${availableBalance} ${currentAsset.symbol}` : "No disponible"}</strong>
                </p>
                <p className="placeholder-copy" style={{ marginTop: "8px" }}>
                  Fuente del balance: <strong>{balanceSource === "missing-token-config" ? "Token demo no configurado" : networkId === "solana" ? (balanceSource === "blockchain-real" ? "Blockchain real (Solana Devnet)" : "Conexión temporalmente no disponible") : networkId === "bnb" ? (balanceSource === "blockchain-real" ? "Blockchain real (BNB Smart Chain Testnet)" : "Conexión temporalmente no disponible") : (balanceSource === "blockchain-real" ? "Blockchain real (Bitcoin Testnet)" : "Balance no disponible")}</strong>
                </p>
                {balanceError ? (
                  <p className="negative" style={{ marginTop: "8px" }}>
                    {balanceError}
                  </p>
                ) : null}
                <p className="placeholder-copy" style={{ marginTop: "8px" }}>
                  Comisión de red estimada: <strong>{draftFeeBreakdown.networkFee} {isTokenAsset ? (networkId === "solana" ? "SOL" : "tBNB") : currentAsset.symbol}</strong>
                </p>
                <p className="placeholder-copy" style={{ marginTop: "8px" }}>
                  Comisión NovaWallet: <strong>{draftFeeBreakdown.appFee.toFixed(6)} {currentAsset.symbol}{isTokenAsset ? " (documental, no debitada on-chain)" : networkId === "bnb" ? " (documental, no debitada on-chain)" : networkId === "bitcoin" ? " (pendiente, no debitada on-chain)" : ""}</strong>
                </p>
                <p className="placeholder-copy" style={{ marginTop: "8px" }}>
                  Total estimado a debitar: <strong>{draftTotalDebit.toFixed(6)} {currentAsset.symbol}</strong>
                </p>
                <p className="placeholder-copy" style={{ marginTop: "8px" }}>
                  Wallet administrativa de la comisión: <strong>{networkId === "bitcoin" ? "No aplica en Bitcoin Testnet" : ADMIN_WALLETS[networkId]}</strong>
                </p>
                {networkId === "bitcoin" ? (
                  <p className="dashboard-note" style={{ marginTop: "8px" }}>
                    Bitcoin usa UTXOs; la comisión puede variar según la red. NovaWallet calculará UTXOs y fee reales al revisar el resumen.
                  </p>
                ) : null}
              </article>

              <button className="auth-button" type="submit">
                Revisar resumen antes de enviar
              </button>
            </form>
          </article>

          <article className="placeholder-card">
            <WalletEmptyState
              title="Validaciones activas"
              description="El formulario ya valida dirección, monto, red seleccionada y balance suficiente antes de permitir la confirmación."
              badge="Flujo validado"
              steps={[
                "Se valida formato de dirección según la red.",
                "La comisión NovaWallet del 1% se asocia a una Wallet administrativa por red.",
                "Bitcoin Testnet valida UTXOs suficientes antes de habilitar la firma local.",
              ]}
              primaryAction={{ to: APP_ROUTES.transactionHistory, label: "Ver historial" }}
              secondaryAction={{ to: APP_ROUTES.dashboard, label: "Volver al dashboard" }}
            />
          </article>
        </section>
      )}
    </AppShell>
  );
}

export default SendTransaction;
