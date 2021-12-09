//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "hardhat/console.sol";

contract Genesis is ERC721, VRFConsumerBase, Ownable {
    enum TokenType {
        GOD,
        DEMIGOD,
        ELEMENTAL
    }
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    /**
     * Chainlink VRF
     */
    bytes32 internal keyHash;
    uint256 internal fee;
    mapping(bytes32 => address) internal requestIdToSender;
    mapping(bytes32 => uint256) internal requestIdToTokenId;
    event RequestedRandomNFT(bytes32 indexed requestId);
    event NFTminted(uint256 tokenId, TokenType tokenType);

    /**
     * Mint parameters
     */
    // TODO Adjust after testing phase
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant MAX_PER_MINT = 1;
    bool public mintActive = false;
    string public baseTokenURI;
    Counters.Counter private _nextTokenId;

    /**
     * Minting properties
     */
    mapping(address => uint256) private tokenMintedCount;

    /**
     * WL parameters
     */
    bytes32 public merkleTreeRoot;

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

    function setMerkleTreeRoot(bytes32 _merkleTreeRoot) public onlyOwner {
        merkleTreeRoot = _merkleTreeRoot;
    }

    /**
     * Switches the mint active state
     */
    function flipMintActive() public onlyOwner {
        mintActive = !mintActive;
    }

    /**
     * Callback when a random number gets generated
     * @param requestId id of the request sent to Chainlink
     * @param randomNumber random number returned by Chainlink
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber) internal override {
        address nftOwner = requestIdToSender[requestId];
        uint256 tokenId = requestIdToTokenId[requestId];
        require(_nextTokenId.current() > tokenId, "TokenId has not been minted yet!");
        _mint(nftOwner, tokenId);
        TokenType tokenType = getTokenType(randomNumber);
        tokenIdToTokenType[tokenId] = tokenType;
        emit NFTminted(tokenId, tokenType);
    }

    /**
     * Mint a given number of tokens
     * The sender has to be included in the free mint list (except if they are the owner)
     * @param count number of tokens to mint
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     */
    function freeMint(uint256 count, uint256 nonce, bytes32[] calldata proof) public payable {
        // TODO
    }

    /**
     * Mint 1 token
     * The sender has to be included in the whitelist (except if they are the owner)
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     * @return requestId request id that was sent to Chainlink VRF
     */
    function mintWhitelist(uint256 nonce, bytes32[] calldata proof) public payable onlyWhitelist(nonce, proof) returns (bytes32 requestId) {
        require(mintActive, "Minting is not active yet!");
        uint256 mintIndex = _nextTokenId.current();
        require(mintIndex <= MAX_SUPPLY, "Sold out");
        require(msg.value >= PRICE, "Not enough ETH");
        require(tokenMintedCount[msg.sender] == 0, "Already minted");
        tokenMintedCount[msg.sender]++;
        _nextTokenId.increment();
        requestId = requestRandomNumberForTokenId(mintIndex);
        emit RequestedRandomNFT(requestId);
        return requestId;
    }

    /**
     * Requests a random number to Chainlink VRF for a given token id
     * @param tokenId id of the token
     * @return requestId id of the request sent to Chainlink
     */
    function requestRandomNumberForTokenId(uint256 tokenId) internal returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        requestId = requestRandomness(keyHash, fee);
        requestIdToSender[requestId] = msg.sender;
        requestIdToTokenId[requestId] = tokenId;
        return requestId;
    }

    /**
     * Generate a leaf of the Merkle tree with a nonce and the address of the sender
     * @param nonce nonce to be used
     * @param addr id of the token
     * @return leaf generated
     */
    function generateLeaf(uint256 nonce, address addr) internal pure returns (bytes32 leaf) {
        return keccak256(abi.encodePacked(nonce, addr));
    }

    /**
     * Verifies the proof of the sender to confirm they are in the whitelist
     * @param nonce nonce to be used
     * @param proof proof
     * @return valid TRUE if the proof is valid, FALSE otherwise
     */
    function verifyProof(uint256 nonce, bytes32[] memory proof) internal view returns (bool valid) {
        return MerkleProof.verify(proof, merkleTreeRoot, generateLeaf(nonce, msg.sender));
    }

    /**
     * Returns the token type (god, demi-god, or elemental) given a random number
     * @param randomNumber random number provided
     * @return tokenType a randomly picked token type
     */
    function getTokenType(uint256 randomNumber) private returns (TokenType tokenType) {
        require(godsCount + demiGodsCount + elementalsCount > 0, "All NFTs have been generated");
        uint256 totalCountLeft = godsCount + demiGodsCount + elementalsCount;
        // Here we add 1 because we use the counts to define the type. If a count is at 0, we ignore it.
        // That"s why we don"t ever want the modulo to return 0.
        uint256 randomTypeIndex = (randomNumber % totalCountLeft) + 1;
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
     * Withdraw balance from the contract
     */
    function withdrawAll() public payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }

    /**
     * Modifier that limits the function to WL members only
     * @param nonce nonce to be used
     * @param proof proof
     * Owner bypasses this (for tests)
     */
    modifier onlyWhitelist(uint256 nonce, bytes32[] memory proof) {
        if (msg.sender != owner()) {
            require(verifyProof(nonce, proof), "Address is not in the whitelist");
        }
        _;
    }
}
