//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "hardhat/console.sol";

contract Genesis is ERC721, VRFConsumerBase, Ownable {
    enum TokenType {
        GOD,
        DEMIGOD,
        ELEMENTAL
    }
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    // Chainlink
    bytes32 internal keyHash;
    uint256 internal fee;
    mapping(bytes32 => address) internal requestIdToSender;
    mapping(bytes32 => uint256) internal requestIdToTokenId;
    event RequestedRandomNFT(bytes32 indexed requestId);

    Counters.Counter private _nextTokenId;

    // TODO Adjust after testing phase
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant MAX_PER_MINT = 1;
    bool public presaleActive = false;
    bool public mintActive = false;
    bool public reservesMinted = false;
    string public baseTokenURI;

    /**
     * Minting properties
     */
    mapping(address => uint256) private addressToMintCount;

    /**
     * Collection properties
     */
    // Gods
    uint256 private godsCount = 50;

    // Demi-Gods
    uint256 private demiGodsCount = 400;

    // Elementals
    uint256 private elementalsCount = 550;
    // TODO: This should have the traits if we want everything on chain
    mapping(uint256 => TokenType) public tokenIdToTokenType;

    constructor(
        address _VRFCoordinator,
        address _LinkToken,
        bytes32 _keyhash,
        string memory baseURI
    )
        VRFConsumerBase(_VRFCoordinator, _LinkToken)
        ERC721("Mythical Sega", "MS")
    {
        _nextTokenId.increment();
        setBaseURI(baseURI);
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
    }

    /**
     * Getters
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    /**
     * Setters
     */
    function setBaseURI(string memory _baseTokenURI) public onlyOwner {
        baseTokenURI = _baseTokenURI;
    }

    function flipPresaleActive() public onlyOwner {
        presaleActive = !presaleActive;
    }

    function flipMintActive() public onlyOwner {
        mintActive = !mintActive;
    }

    // TODO Figure out how we want to reserve the NFTs for the team
    function reserveNFTs() public onlyOwner {
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex.add(10) < MAX_SUPPLY, "Not enough NFTs");

        for (uint256 i = 0; i < 10; i++) {
            _safeMint(msg.sender, mintIndex);
        }
    }

    /**
     * VRFConsumerBase
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber)
        internal
        override
    {
        address nftOwner = requestIdToSender[requestId];
        uint256 tokenId = requestIdToTokenId[requestId];
        require(
            _nextTokenId.current() > tokenId,
            "TokenId has not been minted yet!"
        );
        _mint(nftOwner, tokenId);
        tokenIdToTokenType[tokenId] = generateRandomTraits(randomNumber);
    }

    /**
     * Minting functions
     */
    // TODO Update function to properly use the requests
    // TODO: Add logic for the reserved spots
    function mintNFTs(uint256 _count) public payable {
        require(mintActive, "Minting is not active yet!");
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex + _count <= MAX_SUPPLY, "NFTs sold out");
        require(msg.value >= PRICE * _count, "Not enough ETH");

        for (uint256 i = 0; i < _count; i++) {
            // TODO Validate this
            mintIndex = _nextTokenId.current();
            _nextTokenId.increment();
            requestRandomNumberForTokenId(mintIndex);
        }
    }

    // TODO: Add logic for the reserved spots
    function mint() public payable returns (bytes32) {
        require(mintActive, "Minting is not active yet!");
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex <= MAX_SUPPLY, "NFTs sold out");
        require(msg.value >= PRICE, "Not enough ETH");
        require(
            addressToMintCount[msg.sender] < MAX_PER_MINT,
            "No more minting spot left"
        );

        _nextTokenId.increment();
        bytes32 requestId = requestRandomNumberForTokenId(mintIndex);
        addressToMintCount[msg.sender] = addressToMintCount[msg.sender].add(1);
        emit RequestedRandomNFT(requestId);
        return requestId;
    }

    function requestRandomNumberForTokenId(uint256 _tokenId)
        internal
        returns (bytes32 requestId)
    {
        require(
            LINK.balanceOf(address(this)) >= fee,
            "Not enough LINK - fill contract with faucet"
        );
        requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = msg.sender;
        requestIdToTokenId[requestId] = _tokenId;
        return requestId;
    }

    /**
     * Randomization
     */
    function generateRandomTraits(uint256 _randomNumber)
        private
        returns (TokenType genesisType)
    {
        require(
            godsCount + demiGodsCount + elementalsCount > 0,
            "All NFTs have been generated"
        );
        uint256 totalCountLeft = godsCount + demiGodsCount + elementalsCount;
        // Here we add 1 because we use the counts to define the type. If a count is at 0, we ignore it.
        // That's why we don't ever want the modulo to return 0.
        uint256 randomTypeIndex = (_randomNumber % totalCountLeft) + 1;
        if (randomTypeIndex <= godsCount) {
            godsCount = godsCount.sub(1);
            return TokenType.GOD;
        } else if (randomTypeIndex <= godsCount + demiGodsCount) {
            demiGodsCount = demiGodsCount.sub(1);
            return TokenType.DEMIGOD;
        } else {
            elementalsCount = elementalsCount.sub(1);
            return TokenType.ELEMENTAL;
        }
    }

    /**
     * Enumerable
     */
    // TODO Might want to add this one at some point. We would probably need a method to know the token types too.
    // function tokensOfOwner(address _owner)
    //     external
    //     view
    //     returns (uint256[] memory)
    // {
    //     uint256 tokenCount = balanceOf(_owner);
    //     uint256[] memory tokensId = new uint256[](tokenCount);
    //     for (uint256 i = 0; i < tokenCount; i++) {
    //         tokensId[i] = tokenOfOwnerByIndex(_owner, i);
    //     }

    //     return tokensId;
    // }

    /**
     * Withdrawing
     */
    // TODO Add the logic to distribute funds amongst the team
    function withdraw() public payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }
}
