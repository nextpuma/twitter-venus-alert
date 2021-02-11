// BSC provider constants
const Web3 = require('web3');
const Provider = Web3.providers.HttpProvider;
const config = require('./config.json');
const web3 = new Web3(new Provider(config.node.provider));

const fetch = require("node-fetch");

// Sleeper constants
const promisify = require('util');
const sleep = promisify.promisify(setTimeout);

// Twitter app constants
const twitter = require('twitter-lite');
const conf = require('./conf');
const { get } = require('http');
const client = new twitter(conf);

// Venus Protocol constants
const tokens = {
  vSXP: '0x2ff3d0f6990a40261c66e1ff2017acbc282eb6d0',
  vUSDC: '0xeca88125a5adbe82614ffc12d0db554e2e2867c8',
  vUSDT: '0xfd5840cd36d94d7229439859c0112a4185bc0255',
  vBUSD: '0x95c78222b3d6e262426483d42cfa53685a67ab9d',
  vBNB: '0xa07c5b74c9b40447a954e1466938b865b6bbea36',
  vXVS: '0x151b1e2635a717bcdc836ecd6fbb62b674fe3e1d',
  vBTC: '0x882c173bc7ff3b7786ca16dfed3dfffb9ee7847b',
  vETH: '0xf508fcd89b8bd15579dc79a6827cb4686a3592c8',
  vLTC: '0x57a5297f2cb2c0aac9d554660acd6d385ab50c6b',
  vXRP: '0xb248a295732e0225acd3337607cc01068e3b9c10',
  vBCH: '0x5f0388ebc2b94fa8e123f404b79ccf5f40b29176',
  vDOT: '0x1610bc33319e9398de5f57b33a5b184c806ad217',
  vLINK: '0x650b940a1033b8a1b1873f78730fcfc73ec11f1f',
  vBETH: '0x972207a639cc1b374b893cc33fa251b55ceb7c07',
  vDAI: '0x334b3ecb4dca3593bccc3c7ebd1a1c1d1780fbf1',
  vFIL: '0xf91d58b5ae142dacc749f58a49fcbac340cb0343'
};

const known = {
    PancakeSwap: '0x41182c32f854dd97ba0e0b1816022e0acb2fc0bb',
    Binance: '0x631fc1ea2270e98fbd9d92658ece0f5a269aa161',
    VenusDistribution: '0xfD36E2c2a6789Db23113685031d7F16329158384',
    MXC: '0x4982085C9e2F89F2eCb8131Eca71aFAD896e89CB',
    VenusDeployer: '0x1ca3Ac3686071be692be7f1FBeCd668641476D7e',
    VenusProtocol: '0x151b1e2635a717bcdc836ecd6fbb62b674fe3e1d'
};

// Utils
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
};

function toEther(val) {
  val = (typeof val !== 'string' ? (val).toString() : val);
  return Number(Web3.utils.fromWei(val, 'ether'));
};

async function getPrice(token) {
    let call = await fetch('https://api.venus.io/api/vtoken/');
    call = await call.json();
    let price = null
    if (token != 'all') {
        let map = call['data']['markets'].map(element => {
            if (element['address'] === token) {
                price = element['tokenPrice'];
            }
        })
        return parseFloat(price).toFixed(2)
    } else {
        let prices = {}
        let map = call['data']['markets'].map(element => {
            prices[element['underlyingSymbol']] = element['tokenPrice']
        })
        return prices
    }
}

function getWhaleLevel(usd) {
    if (usd <= 1000000) {
        return '👉'
    } else if (usd > 1000000 && usd <= 5000000) {
        return '🚨'
    } else if (usd > 5000000 && usd <= 10000000) {
        return '🚨🚨'
    } else if (usd > 10000000 && usd <= 20000000) {
        return '🚨🚨🚨'
    } else if (usd > 20000000){
        return '🚨🚨🚨🚨'
    }
    if (usd === 'tvl') {
        return '💰'
    }
};


// XVS alert
async function ListenXVS(block, price, txAmount) {
    sleep(15000).then(async () => {
        try {
            let gblock = await web3.eth.getBlockNumber()
            let logs = await web3.eth.getPastLogs({
            fromBlock: block + 1,
            toBlock: gblock,
            address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
            topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']})
            let map = logs.map(element => ([
                sender = ('0x' + element['topics'][1].replace('0x000000000000000000000000', '').slice(0,40)),
                receiver = ('0x' + element['topics'][2].replace('0x000000000000000000000000', '').slice(0,40)),
                txhash = element['transactionHash'],
                amount =  toEther(web3.utils.hexToNumberString(element['data'])),
                
            ]));
            let hash = []        
            for (item of map) {
                let usd = item[3] * price                        
                if (usd >= txAmount) {
                    if (hash.includes(item[2])) {
                        console.log('===hash_issue');
                    } else {
                        let alert = getWhaleLevel(usd)
                        let amount = `${item[3].toLocaleString('en-US', {maximumFractionDigits:0})} #XVS (${usd.toLocaleString('en-US', {maximumFractionDigits:2})} USD)`
                        if (Object.values(known).includes(item[0])) {
                            sender = `#${getKeyByValue(known, item[0])}`
                        } else {sender = `unknown wallet`}
                        if (Object.values(known).includes(item[1])) {
                            receiver = `#${getKeyByValue(known, item[1])}`
                        } else {receiver = `unknown wallet`}
                        msg = `${alert} ${amount} transferred from ${sender} to ${receiver}\n\nTx: https://bscscan.com/tx/${item[2]}`                        
                        /*
                        client.post('statuses/update', { status: msg }).then(result => {
                        console.log('You successfully tweeted this : "' + result.text + '"');
                        }).catch(console.error);*/
                        console.log(msg);
                        hash.push(item[2]);
                    }
                    
                }
            }
            
            newPrice = await getPrice(tokens.vXVS);                   
            ListenXVS(gblock, await newPrice, txAmount);    
            
        } catch (err) {
            console.log(`Restarting ListenXVS= ${err}`);                  
            ListenXVS(block, price, txAmount);
        }        
    });  
};

// TVL alert
async function ListenTVL(time) {
    let tvl = 0
    sleep(time).then(async () => {
        try {
        let call = await fetch('https://api.venus.io/api/vtoken/');
        call = await call.json()
        let map = call['data']['markets'].map(element => {     
            vl = Number(element['totalSupplyUsd']);
            tvl = tvl + vl
            tvl = Math.round(tvl)            
        
        });
        let vai = await fetch('https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x4bd17003473389a42daf6a0a729f6fdb328bbbd7&address=0x0667Eed0a0aAb930af74a3dfeDD263A73994f216');
        vai = await vai.json();
        vstake = toEther(vai['result']);
        tvl = tvl + vstake
        msg = `${getWhaleLevel('tvl')} Total Value Locked: ${tvl.toLocaleString('en-US', {maximumFractionDigits:0})} USD\n#XVS #Venus #DeFi #BSC`

        /*
        client.post('statuses/update', { status: msg }).then(result => {
        console.log('You successfully tweeted this : "' + result.text + '"');
        }).catch(console.error);*/
        console.log(msg);
        ListenTVL(31000000) 
    } catch (err) {
        console.log(`Restarting tvl=${err}`);
        ListenTVL(10000)
    }
    })      
};


// Start Function
async function start() {
    let gblock = await web3.eth.getBlockNumber();
    let price = await getPrice(tokens.vXVS);
    ListenXVS(gblock, price, 100000);
    ListenTVL(3000000)
};

// Run Bot
start()


