import { ethers } from "ethers";
import { useEffect, useState } from "react";
import Navigation from "./components/Navigation";

function App() {
  const [account, setAccount] = useState(null);

  const loadBlockchainData = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum)

    window.ethereum.on('accountsChanged', async () => {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = ethers.utils.getAddress(accounts[0])
      setAccount(account);
    })
  }
  useEffect(() => {
    loadBlockchainData()
  }, [])


  return (
    <div>

      <Navigation account={account} setAccount={setAccount} />
      <div className='cards__section'>

        <h3>Welcome to Millow</h3>

      </div>

    </div>
  );
}

export default App;
