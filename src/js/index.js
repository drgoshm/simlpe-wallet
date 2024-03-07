import { Polkadot, Ethereum, AddEthereumChainParameter } from '@unique-nft/utils/extension';
import * as ethers from 'ethers';
import { Sdk } from '@unique-nft/sdk/full';
import { UniqueNFTFactory } from '@unique-nft/solidity-interfaces';
import { Utf16, HexString } from 'utf-helpers';


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
  global.transfer = transfer;
  global.changeAttribute = changeAttribute;
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

async function transfer() {
  const $collectionIdInput = document.getElementById('collection-id-for-transfer');
  const $tokenIdInput = document.getElementById('token-id-for-transfer');
  const $recipientInput = document.getElementById('recipient');
  const $walletsSelect = document.getElementById('wallets');

  const collectionId = $collectionIdInput.value;
  const tokenId = $tokenIdInput.value;
  const currentAddress = $walletsSelect.value;
  const to = $recipientInput.value;

  const account = allAccounts.find(({ address }) => currentAddress === address);

  // get the signer payload from the REST SDK
  const buildResponse = await fetch(`${OPAL_SDK_REST_URI}/tokens/transfer?use=Build`, {
    method: 'PATCH',
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collectionId,
      tokenId,
      address: account.address,
      from: account.address,
      to
    })
  });

  const transactionData = await buildResponse.json();

  console.log(transactionData); 
  // transaction data contains:
  // signerPayloadHex - hex string
  // signerPayloadJSON - parsed data of TX to JSON
  // signerPayloadRaw - raw data

  // now we need to sign the transaction
  
  const { signature } = await account.signer.sign(transactionData);

  // send TX
  const sendResponse = await fetch(`${OPAL_SDK_REST_URI}/tokens/transfer?use=Submit`, {
    method: 'PATCH',
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...transactionData,
      signature
    })
  });

  console.log(await sendResponse.json());
}


async function setPropertiesViaMetamask(account, collectionId, tokenId, properties) {
  const metamaskProvider = new ethers.providers.Web3Provider(window.ethereum);
  const nftHelper = await UniqueNFTFactory(collectionId, metamaskProvider.getSigner());

  const tx = await nftHelper.setProperties(tokenId, properties.map(({ key, value }) => ({
    key: HexString.fromArray(Utf16.stringToNumberArray(key)),
    value: HexString.fromArray(Utf16.stringToNumberArray(value))
  })));
  await tx.wait();
}

async function setPropertiesViaRest(account, collectionId, tokenId, properties) {
  const buildResponse = await fetch(`${OPAL_SDK_REST_URI}/tokens/properties?use=Build`, {
    method: 'POST',
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      collectionId,
      tokenId,
      address: account.address,
      properties
    })
  });
  const transactionData = await buildResponse.json();

  const { signature } = await account.signer.sign(transactionData);

  const sendResponse = await fetch(`${OPAL_SDK_REST_URI}/tokens/properties?use=Submit`, {
    method: 'POST',
    mode: "cors",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...transactionData,
      signature
    })
  });

  console.log(sendResponse);
}

const getEncodedAttributes = (attributes, attributeName, attributeValue) => {
  const attributesArr = Object.values(attributes);
  // if token hasn't any attributes, add new one
  if (attributesArr.length === 0)  {
    return [{ 
      key: 'a.0',
      value: `{"_": "${attributeValue}"}`
    }];
  }

  // find index of attribute if it exists
  return attributesArr.reduce((acc, { name }, index) => {
    if (name._ === attributeName) {
      acc.push({ 
        key: `a.${index}`,
        value: `{"_": "${attributeValue}"}`
      });
    }
    return acc;
  }, []);
};

async function changeAttribute() {
  const $collectionIdInput = document.getElementById('collection-id-for-set-attr');
  const $tokenIdInput = document.getElementById('token-id-for-set-attr');
  const $attributeNameInput = document.getElementById('attribute-name');
  const $attributeValueInput = document.getElementById('attribute-value');
  const $walletsSelect = document.getElementById('wallets');

  const currentAddress = $walletsSelect.value; // get the current address

  const account = allAccounts.find(({ address }) => currentAddress === address);

  if (!account)  return;

  const collectionId = Number($collectionIdInput.value);
  const tokenId = Number($tokenIdInput.value);
  const attributeName = $attributeNameInput.value;
  const attributeValue = $attributeValueInput.value;

  // fetch properties
  const tokenResponse = await fetch(`${OPAL_SDK_REST_URI}/tokens?collectionId=${collectionId}&tokenId=${tokenId}`);
  const tokenData = await tokenResponse.json();
  
  const { attributes } = tokenData;

  const encodedAttributes = getEncodedAttributes(attributes, attributeName, attributeValue);

  console.log(encodedAttributes);

  if (account.isMetamask) {
    setPropertiesViaMetamask(account, collectionId, tokenId, encodedAttributes);
  } else {
    setPropertiesViaRest(account, collectionId, tokenId, encodedAttributes);
  }
}

init();

