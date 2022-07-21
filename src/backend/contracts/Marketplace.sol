// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "hardhat/console.sol";

contract Marketplace is ReentrancyGuard {

    // Variables
    address payable public immutable feeAccount; // the account that receives fees
    uint public immutable feePercent; // the fee percentage on sales 
    uint public itemCount;

    // itemId -> Item
    mapping(uint => Item) public items;
    mapping(address => Item) private purchased;
    mapping(address => uint256[]) wallet;

    using Counters for Counters.Counter;
    Counters.Counter public auctionId;
    mapping(uint256 => Auction) public IdToAuction;
    mapping(address => mapping(uint=>uint)) public BidersBalances; // balance of each bidder

    struct Item {
        uint itemId;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
    }

    struct Auction {
        uint id;
        IERC721 nft;
        uint tokenId;
        uint price;
        address payable seller;
        bool sold;
        bool start;
        bool end;
        uint256 endAt;
        address[] bidders;
        address payable highestBidder;
        uint256 highestBid;
    }


    // ------------- Events ------------
    event AuctionCreated(
        uint256 indexed acutionId,
        uint256 indexed nftId,
        address indexed seller,
        uint256 endAt,
        uint256 price
    );
    event Bid(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 indexed nftId,
        uint256 bid
    );
    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 indexed nftId,
        uint256 price
    );

    // event WihdrawSuccess(address indexed seller, uint256 balance);

    event AuctionCanceled(
        uint256 indexed auctionId,
        address indexed seller,
        uint256 indexed itemId
    );

    event Offered(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller
    );
    event Bought(
        uint itemId,
        address indexed nft,
        uint tokenId,
        uint price,
        address indexed seller,
        address indexed buyer
    );

    constructor(uint _feePercent) {
        feeAccount = payable(msg.sender);
        feePercent = _feePercent;
    }

    // Make item to offer on the marketplace
    function makeItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        // increment itemCount
        itemCount ++;
        //myprofile wallet
        wallet[msg.sender].push(itemCount);
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
        // emit Offered event
        emit Offered(
            itemCount,
            address(_nft),
            _tokenId,
            _price,
            msg.sender
        );
    }

    // Make item to offer on the marketplace
    function makeItemAuction(IERC721 _nft, uint256 _tokenId, uint256 _firstBid, uint256 _timesInHour) external nonReentrant {
        require(_firstBid > 0, "price = 0");

        auctionId.increment();
        uint256 currentBidId = auctionId.current();

        IdToAuction[currentBidId].id = currentBidId;
        IdToAuction[currentBidId].start = true;
        IdToAuction[currentBidId].end = false;
        IdToAuction[currentBidId].endAt = block.timestamp + _timesInHour * 1 hours;
        IdToAuction[currentBidId].bidders.push(msg.sender);
        IdToAuction[currentBidId].highestBidder = payable(msg.sender);
        IdToAuction[currentBidId].highestBid = _firstBid;
        IdToAuction[currentBidId].seller = payable(msg.sender);
        IdToAuction[currentBidId].tokenId = _tokenId;

        _nft.transferFrom(msg.sender, address(this), _tokenId);

        emit AuctionCreated(
            currentBidId,
            _tokenId,
            msg.sender,
            block.timestamp + _timesInHour * 1 hours,
            _firstBid
        );
    }

    
    // Make item to offer on the marketplace
    function sellItem(IERC721 _nft, uint _tokenId, uint _price) external nonReentrant {
        require(_price > 0, "Price must be greater than zero");
        // increment itemCount
        itemCount ++;
        wallet[msg.sender].push(itemCount);
        // transfer nft
        _nft.transferFrom(msg.sender, address(this), _tokenId);
        // add new item to items mapping
        items[itemCount] = Item (
            itemCount,
            _nft,
            _tokenId,
            _price,
            payable(msg.sender),
            false
        );
    }

    function purchaseItem(uint _itemId) external payable nonReentrant {
        uint _totalPrice = getTotalPrice(_itemId);
        Item storage item = items[_itemId];
        require(_itemId > 0 && _itemId <= itemCount, "item doesn't exist");
        require(msg.value >= _totalPrice, "not enough ether to cover item price and market fee");
        require(!item.sold, "item already sold");
        // pay seller and feeAccount
        item.seller.transfer(item.price);
        feeAccount.transfer(_totalPrice - item.price);
        // update item to sold
        item.sold = true;
        // transfer nft to buyer
        item.nft.transferFrom(address(this), msg.sender, item.tokenId);
        wallet[msg.sender].push(item.tokenId);
        // emit Bought event
        emit Bought(
            _itemId,
            address(item.nft),
            item.tokenId,
            item.price,
            item.seller,
            msg.sender
        );
    }

    // Enter to the auction (bid)
    function bid(uint256 _auctionId) external payable nonReentrant {
        uint256 highest_bid = IdToAuction[_auctionId].highestBid;
        bool isStarted = IdToAuction[_auctionId].start;
        bool isEnded = IdToAuction[_auctionId].end;
        uint256 endAt = IdToAuction[_auctionId].endAt;
        require(msg.value > highest_bid, "value < H.B");
        require(isStarted, "!started");
        require(isEnded == false, "ended");
        require(block.timestamp < endAt, "time out");
        BidersBalances[msg.sender][_auctionId] += msg.value;
        uint256 itemId = IdToAuction[_auctionId].tokenId;
        IdToAuction[_auctionId].highestBid = msg.value;
        IdToAuction[_auctionId].highestBidder = payable(msg.sender);
        IdToAuction[_auctionId].bidders.push(msg.sender);
        emit Bid(_auctionId, msg.sender, itemId, msg.value);
    }

    // end the auction everyone can call this function require timeend

    function endAuction(IERC721 _nft, uint256 _auctionId) external nonReentrant {
        uint256 endTime = IdToAuction[_auctionId].endAt;
        bool isStarted = IdToAuction[_auctionId].start;
        bool isEnded = IdToAuction[_auctionId].end;
        require(block.timestamp >= endTime, "not yet");
        require(isStarted == true, "not started");
        require(isEnded == false, "ended");
        address payable highestBidder = IdToAuction[_auctionId].highestBidder;
        BidersBalances[highestBidder][_auctionId] = 0;
        uint256 highest_bid = IdToAuction[_auctionId].highestBid;
        uint256 itemId = IdToAuction[_auctionId].tokenId;
        IdToAuction[_auctionId].end = true;
        IdToAuction[_auctionId].start = false;
        _nft.transferFrom(address(this), msg.sender, itemId);
        emit AuctionEnded(_auctionId, highestBidder, itemId, highest_bid);
    }

    function getTotalPrice(uint _itemId) view public returns(uint){
        return((items[_itemId].price*(100 + feePercent))/100);
    }

    function getWallet(address user) view public returns(uint[] memory){
        return(wallet[user]);
    }

    function getPurchased(address user) view public returns(Item memory){
        return(purchased[user]);
    }
}
