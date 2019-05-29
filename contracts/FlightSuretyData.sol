//pragma solidity ^0.4.25;
pragma solidity >=0.4.21 <0.6.0;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;            // authorized contracts
    struct Airline {
       bool isRegistered;
       bool isVoted;
       bool isActive;
    }
    mapping(address => Airline) private  airlines;                       // Mapping for storing airlines
    address[] private activeAirlines;
    mapping(address => address[]) private voters;

    struct Insurance {
        address passenger;
        uint256 value;
        uint256 credit;
    }
    mapping(bytes32 => Insurance[]) private insurances;
    mapping(address => uint256) private passengerCredit;

   

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor( address firstAirline) public
    {
        contractOwner = msg.sender;
        //Mark first airline as Registered-->Voted
        //Has to fund before activation
        airlines[firstAirline] = Airline({isRegistered:true,isVoted:true,isActive:false});
 }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorized");
        _;
    }

    
     modifier requireIsActiveAirline()
    {
        require(airlines[tx.origin].isActive, "Airline not yet funded");
        _;
    }

     modifier checkValidRegistartionState(address airline)
    {
        require(!airlines[airline].isRegistered || !airlines[airline].isVoted, "Airline already registered and voted");
        _;
    }

    modifier checkValidFundingState()
    {
        require(airlines[tx.origin].isVoted && !airlines[tx.origin].isActive, "Airline either waiting for Votes or already Active.");
        _;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    


    function authorizeCaller(address contractAddress )
                            external
                            requireContractOwner()
    {
        authorizedContracts[contractAddress] = 1;
    }

    function deauthorizeContract
                            (
                                address contractAddress
                            )
                            external
                            requireContractOwner()
    {
        delete authorizedContracts[contractAddress];
    }

    
    
    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner ()
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *  First four airlines will be registered without voting
    *  If already registered and caller has not earlier voted, will increment vote
    */
    function registerAirline( address _airline)
                            external
                            requireIsCallerAuthorized()
                            //Only active airlines can register/vote
                            requireIsActiveAirline()
                            //Airlines not yet registered or voted allowed
                            checkValidRegistartionState(_airline)
                            returns(uint256 votes)
    {
        //Determine staus based on votes , first 4 gets wild card
        airlines[_airline] = Airline({isRegistered:true,isVoted:false,isActive:false});
        uint256 v;
        log0(bytes32('entered'));
        //If first 4 airlines then directly move to Voted state
        if(activeAirlines.length < 4) {
            //Wild card - voted is set to true
            airlines[_airline].isVoted = true;
            //Set minimum needed
                v = 4;
        }
        else {
           
            //Consider registartion as first vote by caller
            bool isDuplicate = false;
            for(uint i = 0; i < voters[_airline].length; i++) {
                if(voters[_airline][i] == tx.origin) {
                    isDuplicate = true;
                    break;
                }
            }
            require(!isDuplicate, "Registering airline has already registered this airline before");
            voters[_airline].push(tx.origin);
            //return votes
            v = voters[_airline].length;
            if(v >= activeAirlines.length/2){
                airlines[_airline].isVoted = true;
             }
        }
        return (v);
 }

  function isAirline( address _airline ) external view returns(bool result) {
    return (airlines[_airline].isRegistered);
  }

  function isAirlineVoted( address _airline ) external view returns(bool result) {
    return (airlines[_airline].isVoted);
  }

  function isAirlineActive( address _airline ) external view returns(bool result) {
    return (airlines[_airline].isActive);
  }
  function test() external view returns(address[] memory add, uint count) {
    return (activeAirlines, activeAirlines.length);
  }

  function getActiveAirelinesCount() external view returns(uint count) {
    return (activeAirlines.length);
  }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy( address airline,
                  string flight,
                  uint256 timestamp,
                  uint256 value    
                  ) external
                    payable
    {
        require(value <= 1 ether);
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        insurances[flightKey].push(Insurance({passenger:tx.origin, value:value, credit:0}) );
        passengerCredit[tx.origin] = 0;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flight,
                                    uint256 timestamp
                                )
                                external
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        for(uint256 i = 0; i < insurances[flightKey].length; i++ ) {
            insurances[flightKey][i].credit = insurances[flightKey][i].value + insurances[flightKey][i].value/2;
            passengerCredit[tx.origin] += insurances[flightKey][i].credit;    
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay () external payable
    {
        require(passengerCredit[tx.origin] > 0 ,"No credit to pay");
        uint256 credit = passengerCredit[tx.origin];
        passengerCredit[tx.origin] = 0;
        tx.origin.transfer(credit);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    * 
    */   
    function fund( uint256 value) external payable
    //Only voted and non active airline can participate in funding
    checkValidFundingState()
    {
        require(value >= 10 ether,"Insufficent Fund");
        airlines[tx.origin].isActive = true;
        activeAirlines.push(tx.origin);
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        this.fund(msg.value);
    }


}

