import {Polkadot} from '@unique-nft/utils/extension';

let accounts;

async function getAccounts() {
  if (!!accounts) return;
  const $walletsSelect = document.getElementById('wallets');
  try {
    $walletsSelect.innerHTML = '';
    const result = await Polkadot.enableAndLoadAllWallets();
    accounts = result.accounts;
    accounts.forEach((wallet) => {
      const option = document.createElement('option');
      option.innerHTML = `[${wallet.name}] ${wallet.address}`;
      option.value = wallet.address;
      $walletsSelect.appendChild(option);
    });
  } catch(e) {
    if (e.extensionNotFound) {
      alert(`Please install some polkadot.js compatible extension`)
    } else if (e.accountsNotFound) {
      if (e.userHasWalletsButHasNoAccounts) {
        alert(`Please, create an account in your wallet`)
      } else if (e.userHasBlockedAllWallets) {
        alert(`Please, grant access to at least one of your accounts`)
        await Polkadot.requestAccounts()
      }
    } else {
      alert(`Connection to polkadot extension failed: ${e.message}`)
    }
  }
}

async function sign() {
  const $walletsSelect = document.getElementById('wallets');
  const $messageInput = document.getElementById('message');
  const $signatureTextarea = document.getElementById('signature');

  const currentAddress = $walletsSelect.value;

  const account = accounts.find(({ address }) => currentAddress === address);
  const { signature } = await account.signer.sign($messageInput.value);
  $signatureTextarea.value = signature;
}

async function init() {
  console.log('Initializing');
  const $signBtn = document.getElementById('sign');
  await getAccounts();
  $signBtn.addEventListener('click', sign);
}

init();