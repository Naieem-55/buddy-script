// Static/decorative right sidebar (You might like, Friends contacts).
export default function RightSidebar() {
  const friends = [
    { img: "f1.png", name: "Radovan SkillArena", role: "Software Engineer", online: true },
    { img: "f2.png", name: "Jenny Wilson", role: "Product Designer", online: true },
    { img: "f3.png", name: "Guy Hawkins", role: "Marketer", online: false },
    { img: "f4.png", name: "Robert Fox", role: "Founder", online: false },
  ];
  return (
    <div className="col-xl-3 col-lg-3 col-md-12 col-sm-12">
      <div className="_layout_right_sidebar_wrap">
        <div className="_layout_right_sidebar_inner">
          <div className="_right_inner_area_info _padd_t24 _padd_b6 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area _mar_b16">
            <div className="_left_inner_area_explore_content _mar_b24">
              <h4 className="_left_inner_area_explore_content_title">
                You might like
              </h4>
            </div>
            <div className="_right_inner_area_info_box _mar_b24">
              <div className="_right_inner_area_info_box_image">
                <img
                  src="/assets/images/card_ppl1.png"
                  alt=""
                  className="_ppl_img"
                />
              </div>
              <div className="_right_inner_area_info_box_txt">
                <h4 className="_right_inner_area_info_box_title">Ryan Roslansky</h4>
                <p className="_right_inner_area_info_box_para">CEO of LinkedIn</p>
              </div>
            </div>
          </div>

          <div className="_feed_right_inner_area_card _padd_t24 _padd_r24 _padd_l24 _b_radious6 _feed_inner_area">
            <div className="_feed_top_fixed _mar_b24">
              <h4 className="_left_inner_area_explore_content_title">
                Your Friends
              </h4>
            </div>
            <div className="_feed_bottom_fixed">
              {friends.map((f) => (
                <div
                  className={`_feed_right_inner_area_card_ppl _mar_b24${
                    f.online ? "" : " _feed_right_inner_area_card_ppl_inactive"
                  }`}
                  key={f.name}
                >
                  <div className="_feed_right_inner_area_card_ppl_image">
                    <img
                      src={`/assets/images/${f.img}`}
                      alt=""
                      className="_box_ppl_img"
                    />
                  </div>
                  <div className="_feed_right_inner_area_card_ppl_txt">
                    <h4 className="_feed_right_inner_area_card_ppl_title">
                      {f.name}
                    </h4>
                    <p className="_feed_right_inner_area_card_ppl_para">
                      {f.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
