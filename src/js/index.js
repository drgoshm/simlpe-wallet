import { Polkadot, Ethereum, AddEthereumChainParameter } from '@unique-nft/utils/extension';
import * as ethers from 'ethers';

const DEFAULT_CHAIN = Ethereum.UNIQUE_CHAINS_DATA_FOR_EXTENSIONS.opal; // testnet OPAL

let allAccounts = [];

function updateWalletsList() {
  const $walletsSelect = document.getElementById('wallets');
  $walletsSelect.innerHTML = '';  
  allAccounts.forEach((wallet) => {
    if (!wallet) return;
    const option = document.createElement('option');
    option.innerHTML = `[${wallet.name}] ${wallet.address}`;
    option.value = wallet.address;
    $walletsSelect.appendChild(option);
  });
}

async function sign() {
  const $walletsSelect = document.getElementById('wallets');
  const $messageInput = document.getElementById('message');
  const $signatureTextarea = document.getElementById('signature');

  const currentAddress = $walletsSelect.value;

  const account = allAccounts.find(({ address }) => currentAddress === address);

  const { signature } = await account.signer.sign($messageInput.value);
  $signatureTextarea.value = signature;
}

async function init() {
  console.log('Initializing');
  const $signBtn = document.getElementById('sign');
  $signBtn.addEventListener('click', sign);

  global.connectPolkadotWallet = connectPolkadotWallet;
  global.connectMetamaskWallet = connectMetamaskWallet;
}

/**
 * Change chain in Metamask wallet
 * @param {AddEthereumChainParameter} EthereumChainParams 
 * @returns 
 */
async function changeMetamaskChain(EthereumChainParams) {
  if (!(await window.ethereum?.isConnected())) return;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: EthereumChainParams.chainId }]
    });
  } catch {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [EthereumChainParams]
    });
  }
};

/**
 * Connect with any Polkadot wallet
 * @param {string} extensionName name of the extension
 */
async function connectPolkadotWallet(extensionName) {
  const { accounts } = await Polkadot.loadWalletByName(extensionName);
  allAccounts.push(...accounts);
  updateWalletsList();
}

/**
 * Sign with Metamask
 * @param {string} message 
 * @returns Promise<{ signature: string }>
 */
async function signWithMetamask(message) {
  const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
  const signature = await metamaskProvider.getSigner().signMessage(message);
  return { signature };
}

/**
 * Connect with Metamask
 */
async function connectMetamaskWallet() {
  const {address, chainId} = await Ethereum.requestAccounts();
  if (chainId !== DEFAULT_CHAIN.chainId) {
    await changeMetamaskChain(DEFAULT_CHAIN);
  }
  allAccounts.push({
    name: 'Metamask account',
    isMetamask: true,
    address,
    signer: {
      sign: signWithMetamask
    }
  });
  updateWalletsList();
}

init();

