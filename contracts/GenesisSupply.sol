//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract GenesisSupply is VRFConsumerBase, AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    enum TokenType {
        GOD,
        DEMI_GOD,
        ELEMENTAL
    }

    struct TokenTraits {
        TokenType tokenType;
        // TODO add other traits
    }

    /**
     * Chainlink VRF
     */
    bytes32 private keyHash;
    uint256 private fee;
    uint256 private seed;
    bytes32 private randomizationRequestId;

    /**
     * Supply
     */
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant GODS_MAX_SUPPLY = 50;
    uint256 public constant DEMI_GODS_MAX_SUPPLY = 400;
    uint256 public constant ELEMENTALS_MAX_SUPPLY = 550;
    uint256 public constant RESERVED_GODS_MAX_SUPPLY = 10;

    /**
     * Counters
     */
    Counters.Counter private tokenCounter;
    Counters.Counter private godsCounter;
    Counters.Counter private demiGodsCounter;
    Counters.Counter private elementalsCounter;
    Counters.Counter private reservedGodsTransfered;

    /**
     * Minting properties
     */
    mapping(uint256 => TokenTraits) private tokenIdToTraits;

    /**
     * Utils
     */
    bool public isRevealed;
    bool public isMetadataGenerated;
    bytes32 public constant GENESIS_ROLE = keccak256("GENESIS_ROLE");
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");

    event Minted(uint256 tokenId);
    event CollectionRandomized();
    // TODO Remove on final contract, for dev only
    event RequestedRandomNumber(bytes32 indexed requestId);

    constructor(
        address vrfCoordinator,
        address linkToken,
        bytes32 _keyhash
    ) VRFConsumerBase(vrfCoordinator, linkToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // TODO start other counters at 1 to save on gas
        keyHash = _keyhash;
        fee = 0.1 * 10**18; // 0.1 LINK
        isRevealed = false;
        isMetadataGenerated = false;
        // reserve 10 gods for owner
        for (uint256 i = 0; i < RESERVED_GODS_MAX_SUPPLY; i++) {
            godsCounter.increment();
            tokenCounter.increment();
        }
    }

    /**
     * Setters
     */
    function setIsRevealed(bool _isRevealed) external onlyRole(GENESIS_ROLE) {
        isRevealed = _isRevealed;
    }

    /**
     * Getters
     */
    /**
     * Returns the current index to mint
     * @return index current index of the collection
     */
    function currentIndex() public view returns (uint256 index) {
        return tokenCounter.current();
    }

    /**
     * Returns the number of reserved gods left
     * @return index current index of reserved gods
     */
    function reservedGodsCurrentIndex()
        public
        view
        onlyRole(GENESIS_ROLE)
        returns (uint256 index)
    {
        return reservedGodsTransfered.current();
    }

    /**
     * Minting functions
     */

    /**
     * Mint a token
     */
    function mint() public onlyRole(GENESIS_ROLE) returns (uint256) {
        require(tokenCounter.current() < MAX_SUPPLY, "Not enough supply");
        uint256 tokenId = tokenCounter.current();
        tokenCounter.increment();
        emit Minted(tokenId);
        return tokenId;
    }

    /**
     * Mint reserved gods
     * This function needs to be ran BEFORE the mint is opened to avoid
     * @param count number of gods to transfer
     */
    function mintReservedGods(uint256 count) public onlyRole(GENESIS_ROLE) {
        uint256 nextIndex = reservedGodsCurrentIndex();
        // Here we don't need to increment counter and god supply counter because we already do in the constructor
        // to not initialize the counters at 0
        for (uint256 i = nextIndex; i < count + nextIndex; i++) {
            reservedGodsTransfered.increment();
            tokenIdToTraits[i] = TokenTraits(TokenType.GOD);
        }
    }

    /**
     * Will request a random number from Chainlink to be stored privately in the contract
     */
    function generateSeed() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(seed == 0, "Seed already generated");
        require(randomizationRequestId == 0, "Randomization already started");
        require(
            reservedGodsTransfered.current() == RESERVED_GODS_MAX_SUPPLY,
            "Not all reserve minted"
        );
        require(tokenCounter.current() == MAX_SUPPLY, "Not all minted");
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
        require(seed == 0, "Seed already generated");
        seed = randomNumber;
    }

    /**
     * Metadata functions
     */

    /**
     * Generate the collection traits from a seed (from ChainLink)
     */
    function generateCollectionTraits()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        seedGenerated
    {
        // Here we start at 10 because the 10 first tokens are reserved gods
        for (uint256 i = 10; i < MAX_SUPPLY; i++) {
            tokenIdToTraits[i] = TokenTraits(
                getTokenType(generateRandomNumber(i))
            );
        }
        isMetadataGenerated = true;
        emit CollectionRandomized();
    }

    /**
     * @dev Generates a uint256 random number from seed, nonce and transaction block
     * @param nonce The nonce to be used for the randomization
     * @return randomNumber random number generated
     */
    function generateRandomNumber(uint256 nonce)
        private
        view
        seedGenerated
        returns (uint256 randomNumber)
    {
        return
            uint256(keccak256(abi.encodePacked(block.timestamp, nonce, seed)));
    }

    /**
     * Returns the token type (god, demi-god, or elemental) given a random number
     * @param randomNumber random number provided
     * @return tokenType a randomly picked token type
     */
    function getTokenType(uint256 randomNumber)
        private
        view
        returns (TokenType tokenType)
    {
        uint256 godsLeft = GODS_MAX_SUPPLY - godsCounter.current();
        uint256 demiGodsLeft = DEMI_GODS_MAX_SUPPLY - demiGodsCounter.current();
        uint256 elementalsLeft = ELEMENTALS_MAX_SUPPLY -
            elementalsCounter.current();
        uint256 totalCountLeft = godsLeft + demiGodsLeft + elementalsLeft;
        // Here we add 1 because we use the counts to define the type. If a count is at 0, we ignore it.
        // That's why we don't ever want the modulo to return 0.
        uint256 randomTypeIndex = (randomNumber % totalCountLeft) + 1;
        if (randomTypeIndex <= godsLeft) {
            return TokenType.GOD;
        } else if (randomTypeIndex <= godsLeft + demiGodsLeft) {
            return TokenType.DEMI_GOD;
        } else {
            return TokenType.ELEMENTAL;
        }
    }

    /**
     * Returns the metadata of a token
     * @param tokenId id of the token
     * @return traits metadata of the token
     * FIXME We need to adjust the modifier and reveal date
     */
    function getMetadataForTokenId(uint256 tokenId)
        public
        view
        seedGenerated
        validTokenId(tokenId)
        returns (TokenTraits memory traits)
    {
        require(isMetadataGenerated, "Collection not randomized");
        // Backend has access to metadata before anyone
        if (hasRole(BACKEND_ROLE, msg.sender)) {
            return tokenIdToTraits[tokenId];
        }
        if (isRevealed) {
            return tokenIdToTraits[tokenId];
        }
        revert("Not revealed yet");
    }

    /**
     *  Modifiers
     */

    /**
     * Modifier that checks for a valid tokenId
     * @param tokenId token id
     */
    modifier validTokenId(uint256 tokenId) {
        require(tokenId < MAX_SUPPLY, "Invalid tokenId");
        require(tokenId > 0, "Invalid tokenId");
        _;
    }

    /**
     * Modifier that checks if seed is generated
     */
    modifier seedGenerated() {
        require(seed > 0, "Seed not generated");
        _;
    }
}
