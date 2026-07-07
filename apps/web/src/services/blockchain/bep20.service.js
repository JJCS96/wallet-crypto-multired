import {
  Contract,
  formatUnits,
  HDNodeWallet,
  isAddress,
  parseUnits,
} from "ethers";
import { ASSETS, ASSET_IDS } from "../../config/assets";
import { NETWORKS } from "../../constants/networks";
import {
  assertBnbTestnetProvider,
  buildBnbExplorerUrl,
  getBnbProvider,
  weiToBnbNumber,
} from "./bnb.service";

const BEP20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

function getBep20Asset() {
  return ASSETS[ASSET_IDS.bnbBep20Demo];
}

function assertBep20Configured() {
  const asset = getBep20Asset();

  if (!asset.configured || !isAddress(asset.tokenAddress)) {
    throw new Error("bep20-token-not-configured");
  }

  return asset;
}

function getBep20Contract(providerOrSigner) {
  const asset = assertBep20Configured();
  return new Contract(asset.tokenAddress, BEP20_ABI, providerOrSigner);
}

async function assertBep20ContractExists(provider, tokenAddress) {
  const code = await provider.getCode(tokenAddress);

  if (!code || code === "0x") {
    throw new Error("bep20-contract-not-found");
  }
}

async function getGasPrice(provider) {
  const feeData = await provider.getFeeData();

  if (!feeData.gasPrice) {
    throw new Error("bnb-gas-price-unavailable");
  }

  return feeData.gasPrice;
}

function formatTokenUnits(value, decimals) {
  return Number(formatUnits(value, decimals));
}

export function parseBep20TokenAmountToUnits(amount) {
  const asset = assertBep20Configured();

  try {
    const units = parseUnits(String(amount).trim(), asset.decimals);

    if (units <= 0n) {
      throw new Error("invalid-bep20-amount");
    }

    return units;
  } catch {
    throw new Error("invalid-bep20-amount");
  }
}

export async function getBep20DemoBalance(address) {
  if (!isAddress(address)) {
    throw new Error("invalid-bnb-address");
  }

  const asset = assertBep20Configured();
  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  await assertBep20ContractExists(provider, asset.tokenAddress);
  const contract = getBep20Contract(provider);
  const [rawBalance, contractDecimals, contractSymbol] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals().catch(() => asset.decimals),
    contract.symbol().catch(() => asset.symbol),
  ]);
  const decimals = Number(contractDecimals);

  return {
    network: "bnb",
    assetId: asset.id,
    assetType: "token",
    tokenStandard: "BEP20",
    tokenAddress: asset.tokenAddress,
    symbol: contractSymbol || asset.symbol,
    decimals,
    balance: formatTokenUnits(rawBalance, decimals),
    balanceUnits: rawBalance.toString(),
    source: "blockchain-real",
  };
}

export async function estimateBep20DemoTransferFee({ fromAddress, toAddress, amountUnits }) {
  if (!isAddress(fromAddress) || !isAddress(toAddress)) {
    throw new Error("invalid-bnb-address");
  }

  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  const asset = assertBep20Configured();
  await assertBep20ContractExists(provider, asset.tokenAddress);
  const contract = getBep20Contract(provider);
  const balanceUnits = await contract.balanceOf(fromAddress);

  if (amountUnits > balanceUnits) {
    throw new Error("insufficient-token-funds");
  }

  const gasPrice = await getGasPrice(provider);
  const gasLimit = await contract.transfer.estimateGas(toAddress, amountUnits, {
    from: fromAddress,
  });
  const networkFeeWei = gasLimit * gasPrice;
  const nativeBalanceWei = await provider.getBalance(fromAddress);

  if (networkFeeWei > nativeBalanceWei) {
    throw new Error("insufficient-gas-funds");
  }

  return {
    gasLimit,
    gasPrice,
    networkFeeWei,
    networkFee: weiToBnbNumber(networkFeeWei),
  };
}

export async function sendSignedBep20DemoTransfer({ mnemonic, expectedFromAddress, toAddress, amountUnits }) {
  if (!isAddress(expectedFromAddress) || !isAddress(toAddress)) {
    throw new Error("invalid-bnb-address");
  }

  const asset = assertBep20Configured();
  const provider = getBnbProvider();
  await assertBnbTestnetProvider(provider);
  await assertBep20ContractExists(provider, asset.tokenAddress);
  const wallet = HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    NETWORKS.bnb.derivationPath,
  ).connect(provider);

  if (wallet.address.toLowerCase() !== expectedFromAddress.toLowerCase()) {
    throw new Error("bnb-wallet-mismatch");
  }

  const contract = getBep20Contract(wallet);
  const balanceUnits = await contract.balanceOf(wallet.address);

  if (amountUnits > balanceUnits) {
    throw new Error("insufficient-token-funds");
  }

  const { gasLimit, gasPrice, networkFeeWei } = await estimateBep20DemoTransferFee({
    fromAddress: wallet.address,
    toAddress,
    amountUnits,
  });
  const tx = await contract.transfer(toAddress, amountUnits, {
    gasLimit,
    gasPrice,
  });
  const receipt = await tx.wait(1);

  if (!receipt || receipt.status !== 1) {
    throw new Error("transaction-rejected");
  }

  const receiptGasPrice = receipt.gasPrice || tx.gasPrice || gasPrice;
  const actualNetworkFeeWei = receipt.gasUsed * receiptGasPrice;

  return {
    txHash: tx.hash,
    explorerUrl: buildBnbExplorerUrl(tx.hash),
    chainId: NETWORKS.bnb.chainId,
    gasUsed: receipt.gasUsed.toString(),
    gasPrice: receiptGasPrice.toString(),
    networkFeeWei: actualNetworkFeeWei.toString(),
    networkFee: weiToBnbNumber(actualNetworkFeeWei || networkFeeWei),
    tokenAddress: asset.tokenAddress,
    tokenSymbol: asset.symbol,
    confirmationStatus: "confirmed",
  };
}
