import {Polkadot} from '@unique-nft/utils/extension';

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

  global.connectWallet = connectWallet;
}

/**
 * 
 * @param {string} extensionName name of the extension
 */
async function connectWallet(extensionName) {
  const { accounts } = await Polkadot.loadWalletByName(extensionName);
  allAccounts.push(...accounts);
  updateWalletsList();
}

init();

