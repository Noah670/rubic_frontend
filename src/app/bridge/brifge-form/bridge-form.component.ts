import { Component, OnInit } from '@angular/core';
import {BridgeService} from '../../services/bridge/bridge.service';
import {HttpClient} from '@angular/common/http';
import {List} from 'immutable';
import {IBridgeToken, BridgeNetwork} from '../../services/bridge/types';
import {Web3ApiService} from '../../services/web3Api/web3-api.service';
import {RubicError} from '../../errors/RubicError';
import BigNumber from 'bignumber.js';
import {window} from 'rxjs/operators';
import {InputToken} from '../../components/tokens-input/types';


@Component({
  selector: 'app-bridge-form',
  templateUrl: './bridge-form.component.html',
  styleUrls: ['./bridge-form.component.scss']
})
export class BridgeFormComponent implements OnInit {

  public Blockchains = {
    Ethereum : {
      name : BridgeNetwork.ETHEREUM,
      label: "Ethereum",
      img: "eth.png",
      baseUrl: 'https://etherscan.io',
      addressBaseUrl: 'https://etherscan.io/address/',
      scanner: {
        label: 'Etherscan',
        baseUrl: 'https://etherscan.io/token/'
      },
      symbolName: 'ethSymbol',
      decimalsName: 'ethContractDecimal',
      addressName: 'ethContractAddress'
    },
    Binance: {
      name : BridgeNetwork.BINANCE_SMART_CHAIN,
      label: "Binance Smart Chain",
      img: "bnb.svg",
      baseUrl: 'https://bscscan.com',
      addressBaseUrl: 'https://bscscan.com/address/',
      scanner: {
        label: 'BSCscan',
        baseUrl: 'https://bscscan.com/token/'
      },
      symbolName: 'bscSymbol',
      decimalsName: 'bscContractDecimal',
      addressName: 'bscContractAddress'
    }
  }

  public _fromBlockchain = this.Blockchains.Ethereum;
  public toBlockchain = this.Blockchains.Binance;
  private _tokens: List<IBridgeToken> = List([]);
  public dropDownTokens: List<InputToken> = List([]);
  public _selectedToken: IBridgeToken = null;
  public selectedTokenAsInputToken: InputToken = null;
  public _fromNumber: BigNumber;
  private _fee: BigNumber;
  public _toNumber: BigNumber;

  public feeCalculationProgress: boolean = false;
  public buttonAnimation: boolean = false;
  public tradeInProgress: boolean = false;
  public error: RubicError;
  public tradeSuccessId: string;
  public walletAddress: string = this.bridgeService.walletAddress;

  get tokens(): List<IBridgeToken> {
    return this._tokens;
  }

  set tokens(tokens: List<IBridgeToken>) {
    this._tokens = tokens;
    this.updateDropDownTokens();
  }

  private updateDropDownTokens(): void {
    this.dropDownTokens = this._tokens.map(token =>
      ({
        address: token[this.fromBlockchain.addressName],
        name: token.name,
        symbol: token[this.fromBlockchain.symbolName],
        image: token.icon,
        decimals: token[this.fromBlockchain.decimalsName]
      })
    )
  }

  get selectedToken(): IBridgeToken {
    return this._selectedToken;
  }

  set selectedToken(value: IBridgeToken) {
    this._selectedToken = value;
    this.selectedTokenAsInputToken = this.dropDownTokens.find(token =>
        token.address === this.selectedToken[this.fromBlockchain.addressName]);
  }

  get fromBlockchain() {
    return this._fromBlockchain;
  }

  set fromBlockchain(blockchain) {
    this._fromBlockchain = blockchain;
    this.updateDropDownTokens();
  }

  set fromNumber(fromNumber: BigNumber) {
    this._fromNumber = fromNumber;
    this.setToNumber();
  }

  get fromNumber(): BigNumber {
    return this._fromNumber;
  }

  set fee(fee: BigNumber) {
    this._fee = fee;
    this.setToNumber();
  }

  get fee(): BigNumber {
    return this._fee;
  }

  get toNumber(): string {
    if (this._toNumber == undefined) {
      return ""
    }

    let amount = this._toNumber.toString();

    if (amount.includes('.')) {
      const startIndex = amount.indexOf('.') + 1;
      amount = amount.slice(0, startIndex + this.selectedToken[this.toBlockchain.decimalsName]);
    }

    return amount;
  }

  private setToNumber(): void {
    if (this.fromNumber != undefined && this.fee != undefined) {
      this._toNumber = this.fromNumber.minus(this.fee);
    } else {
      this._toNumber = undefined;
    }
  }

  constructor(private bridgeService: BridgeService) {
    bridgeService.tokens.subscribe(tokens => this.tokens = tokens);
  }

  ngOnInit() { }

  public revertBlockchains() {
    [this.fromBlockchain, this.toBlockchain] = [this.toBlockchain, this.fromBlockchain];
    if (this.selectedToken) {
      this.changeSelectedToken(this.selectedToken);
    }
  }

  private changeSelectedToken(token: IBridgeToken) {
    this.fee = undefined;
    this.selectedToken = token;
    if (!token) {
      return;
    }

    this.feeCalculationProgress = true;
    this.bridgeService.getFee(this.selectedToken.symbol, this.toBlockchain.name)
        .subscribe(
            fee => this.fee = new BigNumber(fee)
            , err => console.log(err)
            , () =>  this.feeCalculationProgress = false)
  }

  public onSelectedTokenChanges(inputToken: InputToken | null) {
    if (inputToken) {
      const bridgeToken: IBridgeToken = this.tokens.find(token =>
          token[this.fromBlockchain.addressName] === inputToken.address)
      this.changeSelectedToken(bridgeToken);
    } else {
      this.changeSelectedToken(null);
    }
  }

  public onTokensNumberChanges(tokensNumber: number | string) {
    if (tokensNumber) {
      this.fromNumber = new BigNumber(tokensNumber);
    }
  }

  public onConfirm() {
    this.buttonAnimation = true;
    this.bridgeService
      .createTrade(this.selectedToken, this.fromBlockchain.name, this.toBlockchain.name, this.fromNumber, () => this.tradeInProgress = true)
      .subscribe(
          (res: string) => {
          this.tradeSuccessId = res;
        },
        err => {
          if (err instanceof RubicError) {
            this.error = err;
          } else {
            this.error = new RubicError();
          }
      }).add(() => {
        this.tradeInProgress = false;
        this.buttonAnimation = false;
    });
  }

  public closeErrorModal() {
    this.error = null;
  }
}
