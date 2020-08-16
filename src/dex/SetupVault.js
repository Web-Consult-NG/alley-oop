import React, {useState, useContext} from "react"
import * as fcl from "@onflow/fcl"

import Card from '../components/Card'
import Header from '../components/Header'
import Code from '../components/Code'
import GlobalContext from '../Global'

const simpleTransaction = `\
import FlowToken from 0x01cf0e2f2f715450

// This transaction configures an account to store and receive tokens defined by
// the FlowToken contract.
transaction {
  var address: Address
  // var receiverRef: [&FlowToken.Vault{FlowToken.Receiver}]

  prepare(acct: AuthAccount) {
    self.address = acct.address
    // Create a new empty Vault object
    let vaultA <- FlowToken.createEmptyVault()
      
    // Store the vault in the account storage
    acct.save<@FlowToken.Vault>(<-vaultA, to: /storage/FlowVault)

    log("Empty Vault stored")

    // Create a public Receiver capability to the Vault
    acct.link<&FlowToken.Vault{FlowToken.Receiver, FlowToken.Balance}>(/public/FlowReceiver, target: /storage/FlowVault)

    log("References created")
  }
}
`
const SetupVault = () => {
  const [status, setStatus] = useState("Not started")
  const [transaction, setTransaction] = useState(null)
  const context = useContext(GlobalContext);
  const address = context.user && context.user.addr

  const runTransaction = async (event) => {
    event.preventDefault()
    
    setStatus("Resolving...")

    const blockResponse = await fcl.send([
      fcl.getLatestBlock(),
    ])

    const block = await fcl.decode(blockResponse)
    
    try {
      const { transactionId } = await fcl.send([
        fcl.transaction(simpleTransaction),
        fcl.proposer(fcl.currentUser().authorization),
        fcl.authorizations([
          fcl.currentUser().authorization,
        ]),
        fcl.payer(fcl.currentUser().authorization),
        fcl.ref(block.id)
      ])

      setStatus("Transaction sent, waiting for confirmation")

      const unsub = fcl
        .tx({ transactionId })
        .subscribe(transaction => {
          setTransaction(transaction)
          
          if (fcl.tx.isSealed(transaction)) {
            setStatus("Transaction is Sealed")
            unsub()
          }
        })
    } catch (error) {
      console.error(error);
      setStatus("Transaction failed")
    }
  }

  return (
    <Card>
      <Header>Create FlowToken vault for {address}</Header>

      <Code>{simpleTransaction}</Code>

      <button onClick={runTransaction}>
        Send Transaction
      </button>

      <Code>Status: {status}</Code>

      {transaction && <Code>{JSON.stringify(transaction, null, 2)}</Code>}
    </Card>
  )
}

export default SetupVault