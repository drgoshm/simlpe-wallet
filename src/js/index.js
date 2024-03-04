import { Polkadot, Ethereum, AddEthereumChainParameter } from '@unique-nft/utils/extension';
import * as ethers from 'ethers';
import { Sdk } from '@unique-nft/sdk/full';

const DEFAULT_CHAIN = Ethereum.UNIQUE_CHAINS_DATA_FOR_EXTENSIONS.opal; // testnet OPAL
const OPAL_SDK_REST_URI = 'https://rest.unique.network/opal/v1';
const COLLECTION_ID = 2216;

const sdk = new Sdk({ baseUrl: OPAL_SDK_REST_URI });

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

  global.getTokensByAccountViaRest = getTokensByAccountViaRest;
  global.getTokensByAccountViaSDK = getTokensByAccountViaSDK;

  global.getTokenData = getTokenData;
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

/**
 * get the list of tokens for the selected account via REST API
 */
async function getTokensByAccountViaRest() {
  const $walletsSelect = document.getElementById('wallets');
  const currentAddress = $walletsSelect.value; // get the current address

  const response = await fetch(`${OPAL_SDK_REST_URI}/tokens/account-tokens?address=${currentAddress}&collectionId=${COLLECTION_ID}`);

  const parsedResponse = await response.json(); // parse the response
  const { tokens } = parsedResponse;

  const $tokenList = document.getElementById('token-list');
  $tokenList.innerHTML = '';  
  tokens.forEach(function(token) {
    const item = document.createElement('li');
    item.innerHTML = `${token.collectionId}/${token.tokenId}`;
    $tokenList.appendChild(item);
  });
}

/**
 * get the list of tokens for the selected account via SDK
 */
async function getTokensByAccountViaSDK() {
  const $walletsSelect = document.getElementById('wallets');
  const currentAddress = $walletsSelect.value; // get the current address

  const response = await sdk.token.accountTokens({ address: currentAddress, collectionId: COLLECTION_ID });

  const $tokenList = document.getElementById('token-list');
  $tokenList.innerHTML = '';  

  response.tokens.forEach(function(token) {
    const item = document.createElement('li');
    item.innerHTML = `${token.collectionId}/${token.tokenId}`;
    $tokenList.appendChild(item);
  });
  
}

/**
 * fetch the token data
 */
async function getTokenData() {
  const $collectionIdInput = document.getElementById('collection-id');
  const $tokenIdInput = document.getElementById('token-id');
  const $tokenData = document.getElementById('token-data');

  const collectionId = $collectionIdInput.value;
  const tokenId = $tokenIdInput.value;

  const response = await fetch(`${OPAL_SDK_REST_URI}/tokens?collectionId=${collectionId}&tokenId=${tokenId}`);

  const data = await response.json();

  $tokenData.innerHTML = '';  

  const $image = document.createElement('img');
  $image.src = data.image.url;
  const $description = document.createElement('div');
  $description.innerHTML = [`Prefix: ${data.collection.tokenPrefix}`,
    `Name: ${data.collection.name}`,
    `Description: ${data.collection.description}`,
    `Owner: ${data.owner}`].join('<br/>');

  const $attributesList = document.createElement('ul');

  Object.values(data.attributes).map(attribute => {
    const $attribute = document.createElement('li');
    $attribute.innerHTML = `${attribute.name._} = ${attribute.value._}`;
    $attributesList.appendChild($attribute);
  });
  
  $tokenData.appendChild($image);
  $tokenData.appendChild($description);
  $tokenData.appendChild($attributesList);
}



init();

