import { useState, useEffect, } from 'react'
import React from "react";
import { ethers } from "ethers"
import { Row, Col, Card, Button, Form } from 'react-bootstrap'
import { Modal, ModalBody, ModalFooter } from "reactstrap";

const Home = ({ marketplace, nft, account }) => {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [currentItem, setCurrentItem] = useState('')
  const [image, setImage] = useState('')
  const [price, setPrice] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [modalOpen, setModalOpen] = React.useState(false);

  const loadMarketplaceItems = async () => {
    // Load all unsold items
    const itemCount = await marketplace.getWallet(account)
    console.log('itemCount res1: ', itemCount,)
    let items = []
    for (let i = 0; i < itemCount.length; i++) {
      console.log('itemCount res2: ', itemCount[i])
      console.log('itemCount res3: ', parseInt(itemCount[i], 10))

      const item = await marketplace.items(parseInt(itemCount[i], 10))
      console.log("Item res:", item)

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
    setLoading(false)
    setItems(items)
  }

  const sellMarketItem = async (item) => {
    console.log("Sell Info Item", item)
    if (!price) return
    console.log("Sell Info Price", price)
    await (await marketplace.sellItem(nft.address, item.itemId, price)).wait()
    //loadMarketplaceItems()
  }

  const sellManager = async (item) => {
    setCurrentItem(item)
    setModalOpen(!modalOpen)
    await sellMarketItem(item)
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
      {items.length != 0 ?
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
                      <Button disabled={item.sold} onClick={() => sellManager(item)} variant="primary" size="lg">
                        Sell
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
            <h2>You don't own any NFT</h2>
          </main>
        )}

      <Modal toggle={() => setModalOpen(!modalOpen)} isOpen={modalOpen}>
        <div className=" modal-header">
          <h5 className=" modal-title" id="exampleModalLabel">
            Modal title
          </h5>
          <button
            aria-label="Close"
            className=" close"
            type="button"
            onClick={() => setModalOpen(!modalOpen)}
          >
            <span aria-hidden={true}>×</span>
          </button>
        </div>
        <ModalBody>
          <Form.Control onChange={(e) => setPrice(e.target.value)} size="lg" required type="number" placeholder="Price in ETH" />
        </ModalBody>
        <ModalFooter>
          <Button
            color="secondary"
            type="button"
            onClick={() => setModalOpen(!modalOpen)}
          >
            Close
          </Button>
          <Button color="primary" type="button" onClick={() => sellMarketItem(currentItem)}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
export default Home