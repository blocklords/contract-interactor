let express = require('express');
let blockchain = require('./blockchain');
let fs = require('fs');
const app = express()
const port = 3000;

let rewardPrize = 10; // first winner gets 10 CWS
let winnersAmount = 10; // ten winners are tracked


// add account from privatekey to web3 to sign contracts
if (process.env.ACCOUNT_1 == undefined) {
    throw "No ACCOUNT_1 environment variable found. Can not connect to blockchain";
}
let nftRushOwner = blockchain.web3.eth.accounts.privateKeyToAccount(process.env.ACCOUNT_1);
blockchain.web3.eth.accounts.wallet.add(nftRushOwner);

var networkId = null;         // set during express listening

// address and abi of second game: nft rush
var artifact = JSON.parse(fs.readFileSync('./abi/NftRush.json', 'utf8'));
var nftRushAddress = null;    // set during express listening
var nftRush = null;           // set during express listening

// address and abi of the Crowns (CWS) erc-20 token
var crownsArtifact = JSON.parse(fs.readFileSync('./abi/CrownsToken.json', 'utf8'));
var crownsAddress = null;     // set during express listening
var crowns;                   // set during express listening


app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

// send a winner set transaction
app.post('/set-leaderboard', async function (req, res) {
    if (req.body == undefined) {
	res.send('{"status": "error", "message":"no json body"}');
	return
    }

    const gasPrice = await blockchain.web3.eth.getGasPrice();
    
    // for now all type of leaderboard reward players with the same amount of
    // CWS tokens.
    // in the next versions, approving CWS tokens should be in the leaderboard blocks
    var totalPrize = blockchain.web3.utils.toWei(calculateTotalPrize().toString());

    const approveGasEstimate = await crowns.methods
	  .approve(nftRushAddress, totalPrize)    
	  .estimateGas({ from: nftRushOwner.address });    


    var approveResult = await crowns.methods
	.approve(nftRushAddress, totalPrize)
	.send({from: nftRushOwner.address, gasPrice: gasPrice, gas: approveGasEstimate * 3});

    console.log(approveResult);

    if (req.body.type == "daily-spent") {
	
	var gasEstimate = await nftRush.methods.announceDailySpentWinners(req.body.session_id,
								       
								   req.body.wallets,
								   req.body.amount)
	  .estimateGas({ from: nftRushOwner.address }); 

	var result = await nftRush.methods	
	    .announceDailySpentWinners(req.body.session_id, req.body.wallets, req.body.amount)	
	    .send({from: nftRushOwner.address, gasPrice: gasPrice, gas: gasEstimate * 3});	

	console.log(result);	
    } else if (req.body.type == "daily-minted") {
	const gasEstimate = await nftRush.methods.announceDailyMintedWinners(req.body.session_id,
								   req.body.wallets,
								   req.body.amount)
	      .estimateGas({ from: nftRushOwner.address });	

	let result = await nftRush.methods	
	    .announceDailyMintedWinners(req.body.session_id, req.body.wallets, req.body.amount)	
	    .send({from: nftRushOwner.address, gasPrice: gasPrice, gas: gasEstimate * 3});	

	console.log(result);	
    }
    
    res.send('{"status": "ok"}'); 
})

app.listen(port, async function(){
    networkId = await blockchain.web3.eth.net.getId();
    nftRushAddress = artifact.networks[networkId].address;
    nftRush = await blockchain.loadContract(blockchain.web3, nftRushAddress, artifact.abi);

    crownsAddress = crownsArtifact.networks[networkId].address;    
    crowns = await blockchain.loadContract(blockchain.web3, crownsAddress, crownsArtifact.abi);

    
    console.log(`Contract interactor at port ${port}`);
})


let calculateTotalPrize = function() {
    let total = 0;
    for(var i=1; i<=winnersAmount; i++) {
	let amount = Math.round(rewardPrize / i);
	total += amount;
	console.log(total+" for "+i+" users");
    }

    return total;
};
