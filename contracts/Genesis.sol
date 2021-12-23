//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./GenesisSupply.sol";
import "hardhat/console.sol";

contract Genesis is ERC721Pausable, VRFConsumerBase, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    /**
     * Chainlink VRF
     */
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 private seed;
    bytes32 private randomizationRequestId;
    event RequestedRandomNumber(bytes32 indexed requestId);
    event Minted(uint256 tokenId);
    event SeedGenerated(bool generated);

    /**
     * Mint parameters
     */
    // TODO Adjust after testing phase
    uint256 public constant PRICE = 0.0000001 ether;
    uint256 public constant WHITELIST_MINT_COUNT = 1;
    string public unrevealedURI;
    string public baseTokenURI;
    mapping(address => uint256) private addressToMaxFreeMintCount;

    /**
     * Merkle tree properties
     */
    bytes32 private whiteListMerkleTreeRoot;

    address genesisSupplyAddress;

    constructor(
        address _genesisSupplyAddress,
        address vrfCoordinator,
        address linkToken,
        bytes32 _keyhash,
        string memory _unrevealedURI
    ) VRFConsumerBase(vrfCoordinator, linkToken) ERC721("Mythical Sega", "MS") {
        genesisSupplyAddress = _genesisSupplyAddress;
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
        unrevealedURI = _unrevealedURI;
        _pause();
    }

    /**
     * Getters
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function isRevealed() internal view returns (bool revealed) {
        return bytes(baseTokenURI).length > 0;
    }

    /**
     * Setters
     */
    function setBaseURI(string memory _baseTokenURI) external onlyOwner {
        // Set in Supply contract for the `getMetadataForTokenId` function
        GenesisSupply(genesisSupplyAddress).setIsRevealed(true);
        baseTokenURI = _baseTokenURI;
    }

    function setWhiteListMerkleTreeRoot(bytes32 _whiteListMerkleTreeRoot)
        external
        onlyOwner
    {
        whiteListMerkleTreeRoot = _whiteListMerkleTreeRoot;
    }

    function setUnrevealedURI(string memory _unrevealedUri) external onlyOwner {
        unrevealedURI = _unrevealedUri;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (!isRevealed()) {
            return unrevealedURI;
        }
        return
            string(abi.encodePacked(baseTokenURI, Strings.toString(tokenId)));
    }

    /**
     * Pause contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * Free mint
     * @param count number of tokens to mint
     */
    function freeMint(uint256 count) external whenNotPaused seedGenerated {
        require(
            addressToMaxFreeMintCount[msg.sender] > 0,
            "Address is not in the free mint list"
        );
        uint256 mintCount = balanceOf(msg.sender) + count;
        require(
            mintCount <= addressToMaxFreeMintCount[msg.sender],
            "Trying to mint more than allowed"
        );
        uint256 tokenId;
        for (uint256 i = 0; i < count; i++) {
            tokenId = GenesisSupply(genesisSupplyAddress).mint(seed);
            _mint(msg.sender, tokenId);
            emit Minted(tokenId);
        }
    }

    /**
     * Whitelist mint
     * @param nonce nonce used to verify that the caller is allowed to mint
     * @param proof Proof to verify that the caller is allowed to mint
     */
    function mintWhitelist(uint256 nonce, bytes32[] calldata proof)
        external
        payable
        whenNotPaused
        seedGenerated
    {
        require(
            verifyProof(nonce, whiteListMerkleTreeRoot, proof),
            "Address is not in the whitelist"
        );
        require(msg.value >= PRICE, "Not enough ETH");
        uint256 mintCount = balanceOf(msg.sender);
        require(mintCount < WHITELIST_MINT_COUNT, "Already minted");
        uint256 tokenId = GenesisSupply(genesisSupplyAddress).mint(seed);
        _mint(msg.sender, tokenId);
        emit Minted(tokenId);
    }

    /**
     * Function to mint the reserved gods
     * TODO Add a to address to send directly to a wallet
     * TODO Maybe we should remove the count and have this function run once to make it more simple
     * @param count number of gods to mint from the reserved pool
     */
    function mintReservedGods(uint256 count) external onlyOwner {
        require(
            GenesisSupply(genesisSupplyAddress).reservedGodsCurrentIndex() +
                count <=
                GenesisSupply(genesisSupplyAddress).RESERVED_GODS_MAX_SUPPLY(),
            "Not enough reserved gods left"
        );
        uint256 startingIndex = GenesisSupply(genesisSupplyAddress)
            .reservedGodsCurrentIndex();
        GenesisSupply(genesisSupplyAddress).mintReservedGods(count);
        // We use the current index if the reserved is done in multiple parts
        for (uint256 i = startingIndex; i < count + startingIndex; i++) {
            _mint(msg.sender, i);
            emit Minted(i);
        }
    }

    /**
     * Add an address to the free mint count
     * @param to address of free minter
     * @param maxCount max free mint allowed for address
     */
    function addFreeMinter(address to, uint256 maxCount) external onlyOwner {
        require(addressToMaxFreeMintCount[to] == 0, "Already added");
        addressToMaxFreeMintCount[to] = maxCount;
    }

    /**
     * Will request a random number from Chainlink to be stored privately in the contract
     */
    function initializeRandomization() external onlyOwner {
        require(seed == 0, "Seed already generated");
        require(randomizationRequestId == 0, "Seed already requested");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        randomizationRequestId = requestRandomness(keyHash, fee);
        emit RequestedRandomNumber(randomizationRequestId);
    }

    /**
     * Callback when a random number gets generated
     * @param requestId id of the request sent to Chainlink
     * @param randomNumber random number returned by Chainlink
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomNumber)
        internal
        override
    {
        require(requestId == randomizationRequestId, "Invalid requestId");
        seed = randomNumber;
    }

    /**
     * Generate a leaf of the Merkle tree with a nonce and the address of the sender
     * @param nonce nonce to be used
     * @param addr id of the token
     * @return leaf generated
     */
    function generateLeaf(uint256 nonce, address addr)
        internal
        pure
        returns (bytes32 leaf)
    {
        return keccak256(abi.encodePacked(nonce, addr));
    }

    /**
     * Verifies the proof of the sender to confirm they are in given list
     * @param nonce nonce to be used
     * @param root Merkle tree root
     * @param proof proof
     * @return valid TRUE if the proof is valid, FALSE otherwise
     */
    function verifyProof(
        uint256 nonce,
        bytes32 root,
        bytes32[] memory proof
    ) internal view returns (bool valid) {
        return MerkleProof.verify(proof, root, generateLeaf(nonce, msg.sender));
    }

    /**
     * Withdraw balance from the contract
     */
    function withdrawAll() external payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ether left to withdraw");
        (bool success, ) = (msg.sender).call{value: balance}("");
        require(success, "Transfer failed.");
    }

    /**
     * Modifier to ensure that seed has been generated
     */
    modifier seedGenerated() {
        require(seed > 0, "Seed not generated");
        _;
    }
}
