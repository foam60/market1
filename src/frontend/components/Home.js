import { useState, useEffect } from 'react'
import { ethers } from "ethers"
import { Row, Col, Card, Button } from 'react-bootstrap'

const Home = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [itemsAuction, setItemsAuction] = useState([])

  const loadMarketplaceItems = async () => {
    // Load all unsold items
    const itemCount = await marketplace.itemCount()
    let items = []
    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.items(i)
      if (!item.sold) {
        // get uri url from nft contract
        const uri = await nft.tokenURI(item.tokenId)
        // use uri to fetch the nft metadata stored on ipfs 
        const response = await fetch(uri)
        const metadata = await response.json()
        // get total price of item (item price + fee)
        const totalPrice = await marketplace.getTotalPrice(item.itemId)
        // Add item to items array
        items.push({
          totalPrice,
          itemId: item.itemId,
          seller: item.seller,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image
        })
      }
    }
    setLoading(false)
    setItems(items)
    loadMarketplaceItemsAuctions()
  }

  const loadMarketplaceItemsAuctions = async () => {
    console.log("Dans Auction Load##########")
    // Load all unsold items
    const itemCount = await marketplace.auctionId()
    let items = []
    for (let i = 1; i <= itemCount; i++) {
      const item = await marketplace.IdToAuction(i)
      console.log("Auction Item", item)
      //if (!item.sold) {
        // get uri url from nft contract
        const uri = await nft.tokenURI(item.tokenId)
        // use uri to fetch the nft metadata stored on ipfs 
        const response = await fetch(uri)
        const metadata = await response.json()
        // get total price of item (item price + fee)
        //const totalPrice = await marketplace.getTotalPrice(item.itemId)
        // Add item to items array
        items.push({
          id: item.id,
          nft: item.nft,
          tokenId: item.tokenId,
          price: item.price,
          seller: item.seller,
          sold: item.sold,
          start: item.start,
          end: item.end,
          endAt: item.endAt,
          bidders: item.bidders,
          highestBidder: item.highestBidder,
          highestBid: item.highestBid,
          name: metadata.name,
          description: metadata.description,
          image: metadata.image
        })
      //}
    }
    setLoading(false)
    setItemsAuction(items)
  }

  const buyMarketItem = async (item) => {
    await (await marketplace.purchaseItem(item.itemId, { value: item.totalPrice })).wait()
    loadMarketplaceItems()
  }

  const bidMarketItem = async (item) => {
    console.log("BID ITEM", item, item.tokenId, parseInt(item.tokenId, 10))

    await (await marketplace.bid(1, { value: item.price + 1000000000000000 })).wait()
    loadMarketplaceItems()
  }

  const sellMarketItem = async (addressNFT,item, price) => {
    await (await marketplace.sellItem(addressNFT, item.itemId, price)).wait()
    loadMarketplaceItems()
  }

  useEffect(() => {
    loadMarketplaceItems()
    
  }, [])
  if (loading) return (
    <main style={{ padding: "1rem 0" }}>
      <h2>Loading...</h2>
    </main>
  )
  return (
    <div className="flex justify-center">
      <h1>Buy Now </h1>
      {items.length > 0 ?
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {items.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body color="secondary">
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>
                      {item.description}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <div className='d-grid'>
                      <Button onClick={() => buyMarketItem(item)} variant="primary" size="lg">
                        Buy for {ethers.utils.formatEther(item.totalPrice)} ETH
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed assets</h2>
          </main>
        )}
      <h1>Auctions</h1>
{itemsAuction.length > 0 ?
        <div className="px-5 container">
          <Row xs={1} md={2} lg={4} className="g-4 py-5">
            {itemsAuction.map((item, idx) => (
              <Col key={idx} className="overflow-hidden">
                <Card>
                  <Card.Img variant="top" src={item.image} />
                  <Card.Body color="secondary">
                    <Card.Title>{item.name}</Card.Title>
                    <Card.Text>
                      {item.description}
                    </Card.Text>
                    <Card.Text>
                      Actual Bid : {ethers.utils.formatEther(item.price)}
                    </Card.Text>
                    <Card.Text>
                      End Time: {parseInt(item.endAt,10)}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <div className='d-grid'>
                      <Button onClick={() => bidMarketItem(itemsAuction)} variant="primary" size="lg">
                        Bid for {ethers.utils.formatEther(item.price)+0.1} ETH
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
        : (
          <main style={{ padding: "1rem 0" }}>
            <h2>No listed assets</h2>
          </main>
        )}
    </div>
  );
}
export default Home